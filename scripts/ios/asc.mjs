#!/usr/bin/env node
/**
 * App Store Connect API (sin dependencias): Bundle ID, perfil «App Store» y
 * comprobación de la app. Lo usan el workflow de iOS y quien lo ejecute a mano.
 *
 * Credenciales (nunca se imprimen):
 *   ASC_KEY_ID, ASC_ISSUER_ID y la llave .p8 en ASC_PRIVATE_KEY (contenido) o
 *   en ASC_KEY_PATH (ruta al archivo).
 *
 * Uso:
 *   node scripts/ios/asc.mjs status                 ¿existen el Bundle ID, la app y el perfil?
 *   node scripts/ios/asc.mjs ensure-bundle          registra el Bundle ID si falta
 *   node scripts/ios/asc.mjs profile <salida>       descarga (o crea) el perfil App Store
 *   node scripts/ios/asc.mjs builds                 últimos builds subidos y su estado
 *   node scripts/ios/asc.mjs screenshots            capturas de la versión en edición, por idioma y tamaño
 *
 * Variables opcionales: BUNDLE_ID (com.sesolibre.mind), APP_NAME, CERT_SERIAL
 * (número de serie del certificado Apple Distribution con el que se firma).
 */
import { createPrivateKey, createSign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const BUNDLE_ID = process.env.BUNDLE_ID ?? 'com.sesolibre.mind';
const APP_NAME = process.env.APP_NAME ?? 'SesoLibre Mind';
const CERT_SERIAL = (process.env.CERT_SERIAL ?? '46C1A8F6085E4C8045E83BF78B08B779').toUpperCase();
const PROFILE_NAME = `${APP_NAME} App Store`;
const API = 'https://api.appstoreconnect.apple.com/v1';

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function keyPem() {
  if (process.env.ASC_PRIVATE_KEY) return process.env.ASC_PRIVATE_KEY;
  if (process.env.ASC_KEY_PATH) return readFileSync(process.env.ASC_KEY_PATH, 'utf8');
  return fail('falta ASC_PRIVATE_KEY o ASC_KEY_PATH');
}

/** JWT ES256 de 15 minutos (máximo permitido: 20). */
function token() {
  const kid = process.env.ASC_KEY_ID;
  const iss = process.env.ASC_ISSUER_ID;
  if (!kid || !iss) fail('faltan ASC_KEY_ID o ASC_ISSUER_ID');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid, typ: 'JWT' });
  const body = b64({ iss, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
  const sig = createSign('SHA256')
    .update(`${head}.${body}`)
    .sign({ key: createPrivateKey(keyPem()), dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${head}.${body}.${sig}`;
}

const JWT = token();

async function api(path, init = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = (data.errors ?? []).map((e) => `${e.title}: ${e.detail}`).join(' | ');
    const err = new Error(`${res.status} ${init.method ?? 'GET'} ${path} → ${detail}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function findBundle() {
  const r = await api(`/bundleIds?filter[identifier]=${BUNDLE_ID}&limit=200`);
  // filter[identifier] también devuelve prefijos: se busca el exacto.
  return r.data.find((b) => b.attributes.identifier === BUNDLE_ID) ?? null;
}

async function ensureBundle() {
  const found = await findBundle();
  if (found) {
    console.log(`✓ Bundle ID ${BUNDLE_ID} ya registrado (${found.id})`);
    return found;
  }
  try {
    const r = await api('/bundleIds', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'bundleIds',
          attributes: { identifier: BUNDLE_ID, name: APP_NAME, platform: 'IOS' },
        },
      }),
    });
    console.log(`✓ Bundle ID ${BUNDLE_ID} registrado (${r.data.id})`);
    return r.data;
  } catch (e) {
    if (e.status === 403)
      fail(
        `la llave no tiene permiso para registrar identificadores (${e.message}). ` +
          'Regístralo en developer.apple.com → Identifiers, o da a la llave acceso a Certificates, Identifiers & Profiles.',
      );
    throw e;
  }
}

async function findCert() {
  const r = await api('/certificates?limit=200');
  const cert = r.data.find(
    (c) => (c.attributes.serialNumber ?? '').toUpperCase() === CERT_SERIAL,
  );
  if (!cert) fail(`no encontré el certificado de distribución con serie ${CERT_SERIAL}`);
  return cert;
}

async function profile(out) {
  if (!out) fail('indica el archivo de salida del perfil');
  const bundle = await ensureBundle();
  const cert = await findCert();
  // ¿Ya hay un perfil App Store vigente para este Bundle ID y este certificado?
  const list = await api(
    `/profiles?filter[profileType]=IOS_APP_STORE&filter[name]=${encodeURIComponent(PROFILE_NAME)}&include=bundleId,certificates&limit=50`,
  );
  let prof = list.data.find(
    (p) =>
      p.attributes.profileState === 'ACTIVE' &&
      p.relationships.bundleId.data?.id === bundle.id &&
      p.relationships.certificates.data?.some((c) => c.id === cert.id),
  );
  if (!prof) {
    const r = await api('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'profiles',
          attributes: { name: PROFILE_NAME, profileType: 'IOS_APP_STORE' },
          relationships: {
            bundleId: { data: { type: 'bundleIds', id: bundle.id } },
            certificates: { data: [{ type: 'certificates', id: cert.id }] },
          },
        },
      }),
    });
    prof = r.data;
    console.log(`✓ Perfil «${PROFILE_NAME}» creado`);
  } else {
    console.log(`✓ Perfil «${PROFILE_NAME}» vigente hasta ${prof.attributes.expirationDate}`);
  }
  writeFileSync(out, Buffer.from(prof.attributes.profileContent, 'base64'));
  console.log(`  UUID ${prof.attributes.uuid} → ${out}`);
}

async function status() {
  const bundle = await findBundle();
  console.log(bundle ? `✓ Bundle ID ${BUNDLE_ID} registrado` : `✗ Bundle ID ${BUNDLE_ID} sin registrar`);
  const apps = await api(`/apps?filter[bundleId]=${BUNDLE_ID}`);
  const app = apps.data[0];
  console.log(
    app
      ? `✓ App en App Store Connect: «${app.attributes.name}» (SKU ${app.attributes.sku}, id ${app.id})`
      : `✗ No hay app en App Store Connect con ${BUNDLE_ID}: créala en el portal (Apps → +)`,
  );
  const cert = await findCert();
  console.log(
    `✓ Certificado: ${cert.attributes.name} (${cert.attributes.certificateType}), vence ${cert.attributes.expirationDate}`,
  );
}

async function builds() {
  const apps = await api(`/apps?filter[bundleId]=${BUNDLE_ID}`);
  const app = apps.data[0];
  if (!app) fail(`no hay app con ${BUNDLE_ID}`);
  const r = await api(
    `/builds?filter[app]=${app.id}&sort=-uploadedDate&limit=5&include=preReleaseVersion`,
  );
  const versions = Object.fromEntries(
    (r.included ?? []).map((v) => [v.id, v.attributes.version]),
  );
  if (!r.data.length) console.log('Aún no hay builds procesados (Apple tarda unos minutos).');
  for (const b of r.data) {
    const a = b.attributes;
    const ver = versions[b.relationships.preReleaseVersion.data?.id] ?? '?';
    console.log(
      `${ver} (${a.version})  ${a.processingState}  subido ${a.uploadedDate}  vence ${a.expirationDate ?? '-'}`,
    );
  }
}

async function screenshots() {
  const apps = await api(`/apps?filter[bundleId]=${BUNDLE_ID}`);
  const app = apps.data[0];
  if (!app) fail(`no hay app con ${BUNDLE_ID}`);
  const versions = await api(`/apps/${app.id}/appStoreVersions?limit=10`);
  const editable = versions.data.filter((v) =>
    ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(
      v.attributes.appStoreState ?? v.attributes.appVersionState,
    ),
  );
  for (const v of editable.length ? editable : versions.data.slice(0, 1)) {
    console.log(`Versión ${v.attributes.versionString} (${v.attributes.appStoreState})`);
    const locs = await api(`/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
    for (const loc of locs.data) {
      const sets = await api(
        `/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?include=appScreenshots&limit=50`,
      );
      if (!sets.data.length) console.log(`  ${loc.attributes.locale}: sin capturas`);
      for (const set of sets.data) {
        const n = set.relationships.appScreenshots.data?.length ?? 0;
        console.log(`  ${loc.attributes.locale}: ${n} × ${set.attributes.screenshotDisplayType}`);
      }
    }
  }
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'status') await status();
  else if (cmd === 'ensure-bundle') await ensureBundle();
  else if (cmd === 'profile') await profile(arg);
  else if (cmd === 'builds') await builds();
  else if (cmd === 'screenshots') await screenshots();
  else fail('uso: asc.mjs status | ensure-bundle | profile <salida> | builds | screenshots');
} catch (e) {
  fail(e.message);
}

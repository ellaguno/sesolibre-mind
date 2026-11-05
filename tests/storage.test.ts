import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../src/core/storage';

// En el entorno de test (jsdom, no nativo) `storage` usa localStorage.
describe('storage (web)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('devuelve null para una clave inexistente', async () => {
    expect(await storage.get('nope')).toBeNull();
  });

  it('persiste y recupera un valor serializado', async () => {
    await storage.set('scores:test', { best: 42 });
    expect(await storage.get<{ best: number }>('scores:test')).toEqual({ best: 42 });
  });

  it('elimina una clave', async () => {
    await storage.set('tmp', 'x');
    await storage.remove('tmp');
    expect(await storage.get('tmp')).toBeNull();
  });
});

describe('storage por perfil (modo familia)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('cada perfil ve sólo sus datos; el principal no usa prefijo', async () => {
    const { setStorageNamespace, profilePrefix, rawStorage } =
      await import('../src/core/storage');
    setStorageNamespace(profilePrefix('main'));
    await storage.set('levels:state', 'principal');
    setStorageNamespace(profilePrefix('abc'));
    expect(await storage.get('levels:state')).toBeNull();
    await storage.set('levels:state', 'abuela');
    expect(await storage.keys()).toEqual(['levels:state']);
    expect(await rawStorage.get('p:abc:levels:state')).toBe('abuela');
    setStorageNamespace(profilePrefix('main'));
    expect(await storage.get('levels:state')).toBe('principal');
    expect(await storage.keys()).toEqual(['levels:state']);
  });
});

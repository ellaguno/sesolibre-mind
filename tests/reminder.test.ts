import { describe, it, expect } from 'vitest';
import { reminderDates } from '../src/core/reminder';

describe('recordatorio diario', () => {
  it('programa los próximos días a la hora elegida', () => {
    const now = new Date(2026, 10, 4, 10, 0);
    const ds = reminderDates(now, '19:30', false, 3);
    expect(ds).toHaveLength(3);
    expect(ds[0].getDate()).toBe(4);
    expect(ds[0].getHours()).toBe(19);
    expect(ds[0].getMinutes()).toBe(30);
    expect(ds[2].getDate()).toBe(6);
  });

  it('se salta hoy si ya pasó la hora o si la sesión ya está hecha', () => {
    const late = new Date(2026, 10, 4, 20, 0);
    expect(reminderDates(late, '19:30', false, 3)[0].getDate()).toBe(5);
    const early = new Date(2026, 10, 4, 10, 0);
    expect(reminderDates(early, '19:30', true, 3)[0].getDate()).toBe(5);
  });
});

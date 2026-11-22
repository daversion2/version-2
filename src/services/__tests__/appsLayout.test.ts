import { actionOrder, appsViewOf, TodayAppItem, upNext } from '../appsLayout';

const item = (id: string, over: Partial<TodayAppItem> = {}): TodayAppItem => ({
  id,
  title: id,
  short: id,
  color: '#000000',
  icon: 'ellipse',
  note: '',
  done: false,
  plan: false,
  action: 'Start',
  ...over,
});

describe('appsViewOf', () => {
  it('reads a stored layout, and falls back to the icon grid', () => {
    expect(appsViewOf('upnext')).toBe('upnext');
    expect(appsViewOf('junk')).toBe('grid');
    expect(appsViewOf(undefined)).toBe('grid');
  });
});

describe('actionOrder', () => {
  it('puts the plan first and what is done today last', () => {
    const items = [item('meditate', { done: true }), item('meals'), item('workouts', { plan: true }), item('craving')];
    expect(actionOrder(items).map((i) => i.id)).toEqual(['workouts', 'meals', 'craving', 'meditate']);
  });
});

describe('upNext', () => {
  it('picks the plan, else the first app not done, else nothing', () => {
    const items = [item('meditate', { done: true }), item('meals'), item('workouts', { plan: true })];
    expect(upNext(items).next?.id).toBe('workouts');
    expect(upNext(items).rest.map((i) => i.id)).toEqual(['meditate', 'meals']);
    expect(upNext([item('meditate', { done: true }), item('meals')]).next?.id).toBe('meals');
    expect(upNext([item('meditate', { done: true })]).next).toBeNull();
  });
});

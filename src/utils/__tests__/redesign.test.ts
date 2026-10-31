describe('applyRedesign', () => {
  it('writes the redesign colours and radii over the shared theme, and leaves the fonts alone', () => {
    jest.isolateModules(() => {
      const theme = require('../../constants/theme');
      const { applyRedesign, isRedesignOn } = require('../redesign');
      const fontsBefore = { ...theme.Fonts };
      expect(isRedesignOn()).toBe(false);
      expect(theme.Colors.lightGray).toBe('#F2F2F2');

      applyRedesign();

      expect(isRedesignOn()).toBe(true);
      expect(theme.Colors.lightGray).toBe('#F2F2F7');
      expect(theme.Colors.primary).toBe('#217180'); // untouched keys stay
      expect(theme.BorderRadius.lg).toBe(22);
      expect(theme.BorderRadius.full).toBe(999);
      expect(theme.Fonts).toEqual(fontsBefore); // brand fonts stay (founder, 2026-10-31)
    });
  });
});

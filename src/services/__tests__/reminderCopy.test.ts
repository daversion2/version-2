import { anchorAsSecondPerson, reminderBody } from '../reminderCopy';

// =============================================================================
// REMINDER COPY — the output here goes to a lock screen, quoting the user's own
// words back at them. There is no way to see it before a real device shows it
// to someone, so the shapes people actually type are pinned here instead.
// =============================================================================

describe('anchorAsSecondPerson', () => {
  it('converts the shape the onboarding field asks for', () => {
    expect(anchorAsSecondPerson('have my coffee')).toBe('have your coffee');
    expect(anchorAsSecondPerson('my morning coffee')).toBe('your morning coffee');
  });

  it('strips a leading connective the template already supplies', () => {
    // "Right after you after I brush..." was the original output.
    expect(anchorAsSecondPerson('after I brush my teeth')).toBe('brush your teeth');
    expect(anchorAsSecondPerson('when I get home')).toBe('get home');
    expect(anchorAsSecondPerson('once I sit down')).toBe('sit down');
    expect(anchorAsSecondPerson('as soon as I wake up')).toBe('wake up');
    expect(anchorAsSecondPerson('right after my shower')).toBe('your shower');
  });

  it('strips a bare leading subject', () => {
    expect(anchorAsSecondPerson('I walk the dog')).toBe('walk the dog');
  });

  it('converts first-person forms mid-phrase', () => {
    expect(anchorAsSecondPerson('shower and I get dressed')).toBe('shower and you get dressed');
    expect(anchorAsSecondPerson('make myself breakfast')).toBe('make yourself breakfast');
    expect(anchorAsSecondPerson('the alarm wakes me up')).toBe('the alarm wakes you up');
  });

  it('removes a leading subject and conjugates the verb, rather than emitting "am done"', () => {
    expect(anchorAsSecondPerson("I'm done with dinner")).toBe('are done with dinner');
    expect(anchorAsSecondPerson('I am done with dinner')).toBe('are done with dinner');
    expect(anchorAsSecondPerson("I've eaten")).toBe('have eaten');
    expect(anchorAsSecondPerson('I was in the shower')).toBe('were in the shower');
    expect(anchorAsSecondPerson("I'll be home")).toBe('will be home');
  });

  it('never emits a leading "you" — the template already supplies it', () => {
    // "you've eaten" here would render "Right after you you've eaten".
    const inputs = [
      "I'm done",
      "I've eaten",
      'I am done',
      'I walk the dog',
      'after I brush my teeth',
      'when I get home',
      'me and my coffee',
    ];
    inputs.forEach((input) => {
      expect(anchorAsSecondPerson(input)).not.toMatch(/^you\b/i);
    });
  });

  it('does not maul words that merely contain a pronoun', () => {
    // \b anchors matter: "identity", "mystery", "import" must survive intact.
    expect(anchorAsSecondPerson('finish my mystery novel')).toBe('finish your mystery novel');
    expect(anchorAsSecondPerson('import the files')).toBe('import the files');
  });

  it('tidies whitespace and trailing punctuation the template supplies', () => {
    expect(anchorAsSecondPerson('  have   my  coffee.  ')).toBe('have your coffee');
  });

  it('returns null when nothing usable is left', () => {
    // Callers must fall back rather than render "Right after you .".
    expect(anchorAsSecondPerson(undefined)).toBeNull();
    expect(anchorAsSecondPerson('')).toBeNull();
    expect(anchorAsSecondPerson('   ')).toBeNull();
    expect(anchorAsSecondPerson('after')).toBeNull();
    expect(anchorAsSecondPerson('after I')).toBeNull();
  });
});

describe('reminderBody', () => {
  it('uses the anchor and pairing together when both exist', () => {
    expect(reminderBody({ anchor: 'after I brush my teeth', pairing: 'my podcast' })).toBe(
      "Right after you brush your teeth. Don't forget my podcast 🎧"
    );
  });

  it('falls back through anchor-only, pairing-only and neither', () => {
    expect(reminderBody({ anchor: 'have my coffee' })).toBe(
      'Right after you have your coffee — a few minutes is all it takes.'
    );
    expect(reminderBody({ pairing: 'my podcast' })).toBe(
      'Make it enjoyable — pair it with my podcast 🎧'
    );
    expect(reminderBody({})).toBe('A few minutes now is all it takes.');
    expect(reminderBody()).toBe('A few minutes now is all it takes.');
  });

  it('falls back to pairing-only when the anchor reduces to nothing', () => {
    expect(reminderBody({ anchor: 'after', pairing: 'my podcast' })).toBe(
      'Make it enjoyable — pair it with my podcast 🎧'
    );
  });

  it('never emits a dangling "Right after you ."', () => {
    const bodies = ['', '  ', 'after', 'when I', 'I'].map((anchor) => reminderBody({ anchor }));
    bodies.forEach((body) => expect(body).not.toMatch(/Right after you\s*[.—]/));
  });
});

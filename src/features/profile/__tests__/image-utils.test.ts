import { base64ToBytes, fitWithin } from '../image-utils';

describe('base64ToBytes', () => {
  it('decodes standard base64, with and without padding', () => {
    expect(Array.from(base64ToBytes('SGVsbG8='))).toEqual([72, 101, 108, 108, 111]);
    expect(Array.from(base64ToBytes('SGVsbG8'))).toEqual([72, 101, 108, 108, 111]);
    expect(Array.from(base64ToBytes('AAEC/w=='))).toEqual([0, 1, 2, 255]);
  });

  it('ignores whitespace and line breaks', () => {
    expect(Array.from(base64ToBytes('SGVs\nbG8='))).toEqual([72, 101, 108, 108, 111]);
  });

  it('round-trips a larger payload encoded by the platform', () => {
    const original = Array.from({ length: 1000 }, (_, index) => (index * 37) % 256);
    const encoded = btoa(String.fromCharCode(...original));
    expect(Array.from(base64ToBytes(encoded))).toEqual(original);
  });
});

describe('fitWithin', () => {
  it('leaves small photos alone', () => {
    expect(fitWithin(1080, 1350, 1440)).toBeNull();
  });

  it('shrinks the longest side', () => {
    expect(fitWithin(3024, 4032, 1440)).toEqual({ height: 1440 });
    expect(fitWithin(4032, 3024, 1440)).toEqual({ width: 1440 });
  });
});

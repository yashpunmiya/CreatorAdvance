import { parseEip155ChainId } from '../chain';

describe('parseEip155ChainId', () => {
  it('accepts Reown numeric chain IDs', () => {
    expect(parseEip155ChainId(1874)).toBe(1874);
  });

  it('accepts hexadecimal EIP-1193 chain IDs', () => {
    expect(parseEip155ChainId('0x752')).toBe(1874);
  });

  it('accepts decimal-string chain IDs', () => {
    expect(parseEip155ChainId('1874')).toBe(1874);
  });

  it('rejects malformed or unsafe chain IDs', () => {
    expect(parseEip155ChainId('eip155:1874')).toBeUndefined();
    expect(parseEip155ChainId(Number.MAX_SAFE_INTEGER + 1)).toBeUndefined();
  });
});

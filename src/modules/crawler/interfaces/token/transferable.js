/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { PublicKey, UInt64, Struct } from 'o1js';
class TransferFromToOptions extends Struct({
    from: PublicKey,
    to: PublicKey,
    amount: UInt64,
}) {
}
export { TransferFromToOptions };
//# sourceMappingURL=transferable.js.map
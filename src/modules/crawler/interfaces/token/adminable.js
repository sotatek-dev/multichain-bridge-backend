/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Struct, Field, isReady, } from 'o1js';
await isReady;
class AdminAction extends Struct({
    type: Field,
}) {
    static fromType(type) {
        return new AdminAction({ type: Field(type) });
    }
}
AdminAction.types = {
    mint: 0,
    burn: 1,
    setTotalSupply: 2,
    setPaused: 3,
    setVerificationKey: 4,
};
export { AdminAction };
//# sourceMappingURL=adminable.js.map
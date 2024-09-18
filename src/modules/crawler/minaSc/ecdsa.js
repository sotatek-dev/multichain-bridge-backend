import { ZkProgram, Crypto, createEcdsaV2, createForeignCurveV2, Bool, Bytes, } from 'o1js';
export { keccakAndEcdsa, ecdsa, Secp256k1, Ecdsa, Bytes32, Bytes256 };
class Secp256k1 extends createForeignCurveV2(Crypto.CurveParams.Secp256k1) {
}
class Scalar extends Secp256k1.Scalar {
}
class Ecdsa extends createEcdsaV2(Secp256k1) {
}
class Bytes32 extends Bytes(32) {
}
class Bytes256 extends Bytes(256) {
}
const keccakAndEcdsa = ZkProgram({
    name: 'ecdsa',
    publicInput: Bytes256,
    publicOutput: Bool,
    methods: {
        verifyEcdsa: {
            privateInputs: [Ecdsa, Secp256k1],
            async method(message, signature, publicKey) {
                return signature.verifyV2(message, publicKey);
            },
        },
    },
});
const ecdsa = ZkProgram({
    name: 'ecdsa-only',
    publicInput: Scalar,
    publicOutput: Bool,
    methods: {
        verifySignedHash: {
            privateInputs: [Ecdsa, Secp256k1],
            async method(message, signature, publicKey) {
                return signature.verifySignedHashV2(message, publicKey);
            },
        },
    },
});
//# sourceMappingURL=ecdsa.js.map
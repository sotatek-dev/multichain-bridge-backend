var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PublicKey, SmartContract, UInt64, method, Struct } from 'o1js';
class UnlockEvent extends Struct({
    tokenAddress: PublicKey,
    receiver: PublicKey,
    amount: UInt64
}) {
    constructor(tokenAddress, receiver, amount) {
        super({ tokenAddress, receiver, amount });
    }
}
export class Bridge extends SmartContract {
    constructor() {
        super(...arguments);
        this.events = { "Unlock": UnlockEvent };
    }
    decrementBalance(amount) {
        this.balance.subInPlace(amount);
    }
    unlock(tokenAddress, receiver, amount) {
        this.balance.subInPlace(amount);
        this.emitEvent("Unlock", new UnlockEvent(tokenAddress, receiver, amount));
    }
}
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt64]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "decrementBalance", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, PublicKey, UInt64]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "unlock", null);
//# sourceMappingURL=Bridge.js.map
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PublicKey, SmartContract, State, UInt64, method, state, Struct } from 'o1js';
class UnlockEvent extends Struct({
    receiver: PublicKey,
    tokenAddress: PublicKey,
    amount: UInt64,
    id: UInt64,
}) {
    constructor(receiver, tokenAddress, amount, id) {
        super({ receiver, tokenAddress, amount, id });
    }
}
class LockEvent extends Struct({
    tokenAddress: PublicKey,
    amount: UInt64,
}) {
    constructor(tokenAddress, amount) {
        super({ tokenAddress, amount });
    }
}
export class Bridge extends SmartContract {
    constructor() {
        super(...arguments);
        this.minter = State();
        this.minAmount = State();
        this.maxAmount = State();
        this.events = { "Unlock": UnlockEvent, "Lock": LockEvent };
    }
    firstInitialize(_minter) {
        this.minter.set(_minter);
    }
    decrementBalance(amount) {
        this.balance.subInPlace(amount);
        this.minter.set(this.sender);
    }
    setMinter(_minter) {
        this.minter.getAndRequireEquals().assertEquals(this.sender);
        this.minter.set(_minter);
    }
    setMinAmount(_min) {
        this.minter.getAndRequireEquals().assertEquals(this.sender);
        this.minAmount.assertEquals(this.minAmount.get());
        this.minAmount.set(_min);
    }
    setMaxAmount(_max) {
        this.minter.getAndRequireEquals().assertEquals(this.sender);
        this.maxAmount.assertEquals(this.maxAmount.get());
        this.maxAmount.set(_max);
    }
    checkMinMax(amount) {
        this.maxAmount.assertEquals(this.maxAmount.get());
        this.minAmount.assertEquals(this.minAmount.get());
        this.minAmount.get().assertLessThan(amount);
        this.maxAmount.get().assertGreaterThan(amount);
    }
    unlock(tokenAddress, amount, receiver, id) {
        this.minter.getAndRequireEquals().assertEquals(this.sender);
        this.maxAmount.assertEquals(this.maxAmount.get());
        this.minAmount.assertEquals(this.minAmount.get());
        this.minAmount.get().assertLessThan(amount);
        this.maxAmount.get().assertGreaterThan(amount);
        this.emitEvent("Unlock", new UnlockEvent(receiver, tokenAddress, amount, id));
    }
}
__decorate([
    state(PublicKey),
    __metadata("design:type", Object)
], Bridge.prototype, "minter", void 0);
__decorate([
    state(UInt64),
    __metadata("design:type", Object)
], Bridge.prototype, "minAmount", void 0);
__decorate([
    state(UInt64),
    __metadata("design:type", Object)
], Bridge.prototype, "maxAmount", void 0);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "firstInitialize", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt64]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "decrementBalance", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "setMinter", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt64]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "setMinAmount", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt64]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "setMaxAmount", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt64]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "checkMinMax", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, UInt64, PublicKey, UInt64]),
    __metadata("design:returntype", void 0)
], Bridge.prototype, "unlock", null);
//# sourceMappingURL=Bridge.js.map
import {
  Account,
  AccountUpdate,
  AccountUpdateForest,
  method,
  PublicKey,
  State,
  state,
  Struct,
  TokenContract,
  UInt64,
} from 'o1js';
import { __decorate, __metadata } from 'tslib';

export class FungibleToken extends TokenContract {
  constructor() {
    super(...arguments);
    this.decimals = UInt64.from(9);
    this.owner = State();
    this.supply = State();
    this.circulating = State();
    this.events = {
      SetOwner: PublicKey,
      Mint: MintEvent,
      SetSupply: UInt64,
      Burn: BurnEvent,
      Transfer: TransferEvent,
    };
  }
  async deploy(props) {
    await super.deploy(props);
    this.owner.set(props.owner);
    this.supply.set(props.supply);
    this.circulating.set(UInt64.from(0));
    this.account.tokenSymbol.set(props.symbol);
    this.account.zkappUri.set(props.src);
  }
  ensureOwnerSignature() {
    const owner = this.owner.getAndRequireEquals();
    return AccountUpdate.createSigned(owner);
  }
  async setOwner(owner) {
    this.ensureOwnerSignature();
    this.owner.set(owner);
    this.emitEvent('SetOwner', owner);
  }
  async mint(recipient, amount) {
    this.ensureOwnerSignature();
    const supply = this.supply.getAndRequireEquals();
    const circulating = this.circulating.getAndRequireEquals();
    const nextCirculating = circulating.add(amount);
    // TODO: is this where we'd use `Provable.if` and witness creation?
    nextCirculating.assertLessThanOrEqual(supply, 'Minting the provided amount would overflow the total supply.');
    this.circulating.set(nextCirculating);
    const accountUpdate = this.internal.mint({ address: recipient, amount });
    this.emitEvent('Mint', new MintEvent({ recipient, amount }));
    return accountUpdate;
  }
  async setSupply(amount) {
    this.ensureOwnerSignature();
    this.circulating.getAndRequireEquals().assertLessThanOrEqual(amount);
    this.supply.set(amount);
    this.emitEvent('SetSupply', amount);
  }
  async burn(from, amount) {
    this.circulating.set(this.circulating.getAndRequireEquals().sub(amount));
    const accountUpdate = this.internal.burn({ address: from, amount });
    this.emitEvent('Burn', new BurnEvent({ from, amount }));
    return accountUpdate;
  }
  async transfer(from, to, amount) {
    this.internal.send({ from, to, amount });
    this.emitEvent('Transfer', new TransferEvent({ from, to, amount }));
  }
  async approveBase(updates) {
    this.checkZeroBalanceChange(updates);
    // TODO: event emission here
  }
  async getBalanceOf(address) {
    const account = Account(address, this.deriveTokenId());
    const balance = account.balance.get();
    account.balance.requireEquals(balance);
    return balance;
  }
  async getSupply() {
    return this.supply.getAndRequireEquals();
  }
  async getCirculating() {
    return this.circulating.getAndRequireEquals();
  }
  async getDecimals() {
    return this.decimals;
  }
}
__decorate([state(PublicKey), __metadata('design:type', Object)], FungibleToken.prototype, 'owner', void 0);
__decorate([state(UInt64), __metadata('design:type', Object)], FungibleToken.prototype, 'supply', void 0);
__decorate([state(UInt64), __metadata('design:type', Object)], FungibleToken.prototype, 'circulating', void 0);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey]),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'setOwner',
  null,
);
__decorate(
  [
    method.returns(AccountUpdate),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey, UInt64]),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'mint',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [UInt64]),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'setSupply',
  null,
);
__decorate(
  [
    method.returns(AccountUpdate),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey, UInt64]),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'burn',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey, PublicKey, UInt64]),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'transfer',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [AccountUpdateForest]),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'approveBase',
  null,
);
__decorate(
  [
    method.returns(UInt64),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey]),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'getBalanceOf',
  null,
);
__decorate(
  [
    method.returns(UInt64),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'getSupply',
  null,
);
__decorate(
  [
    method.returns(UInt64),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'getCirculating',
  null,
);
__decorate(
  [
    method.returns(UInt64),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  FungibleToken.prototype,
  'getDecimals',
  null,
);
export class MintEvent extends Struct({
  recipient: PublicKey,
  amount: UInt64,
}) {}
export class BurnEvent extends Struct({
  from: PublicKey,
  amount: UInt64,
}) {}
export class TransferEvent extends Struct({
  from: PublicKey,
  to: PublicKey,
  amount: UInt64,
}) {}
//# sourceMappingURL=FungibleToken.js.map

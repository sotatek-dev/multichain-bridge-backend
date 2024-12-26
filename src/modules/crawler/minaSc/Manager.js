import { method, PublicKey, SmartContract, State, state } from 'o1js';

var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function') return Reflect.metadata(k, v);
  };

export class Manager extends SmartContract {
  constructor() {
    super(...arguments);
    this.admin = State();
    this.minter_1 = State();
    this.minter_2 = State();
    this.minter_3 = State();
  }
  async deploy(args) {
    await super.deploy(args);
    this.minter_1.set(args._minter_1);
    this.minter_2.set(args._minter_2);
    this.minter_3.set(args._minter_3);
    this.admin.set(args._admin);
  }
  isAdmin(sender) {
    this.admin.getAndRequireEquals().assertEquals(sender);
  }
  isMinter(sender) {
    const minter1 = this.minter_1.getAndRequireEquals();
    const minter2 = this.minter_2.getAndRequireEquals();
    const minter3 = this.minter_3.getAndRequireEquals();
    // Check if sender matches any of the minters
    const isMinter1 = sender.equals(minter1);
    const isMinter2 = sender.equals(minter2);
    const isMinter3 = sender.equals(minter3);
    // Require that sender is one of the minters
    isMinter1.or(isMinter2).or(isMinter3).assertTrue();
  }
  async changeAdmin(_admin) {
    this.isAdmin(this.sender.getAndRequireSignature());
    this.admin.set(_admin);
  }
  async changeMinter_1(_minter_1) {
    this.isAdmin(this.sender.getAndRequireSignature());
    this.minter_1.set(_minter_1);
  }
  async changeMinter_2(_minter_2) {
    this.isAdmin(this.sender.getAndRequireSignature());
    this.minter_2.set(_minter_2);
  }
  async changeMinter_3(_minter_3) {
    this.isAdmin(this.sender.getAndRequireSignature());
    this.minter_3.set(_minter_3);
  }
}
__decorate([state(PublicKey), __metadata('design:type', Object)], Manager.prototype, 'admin', void 0);
__decorate([state(PublicKey), __metadata('design:type', Object)], Manager.prototype, 'minter_1', void 0);
__decorate([state(PublicKey), __metadata('design:type', Object)], Manager.prototype, 'minter_2', void 0);
__decorate([state(PublicKey), __metadata('design:type', Object)], Manager.prototype, 'minter_3', void 0);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey]),
    __metadata('design:returntype', Promise),
  ],
  Manager.prototype,
  'changeAdmin',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey]),
    __metadata('design:returntype', Promise),
  ],
  Manager.prototype,
  'changeMinter_1',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey]),
    __metadata('design:returntype', Promise),
  ],
  Manager.prototype,
  'changeMinter_2',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey]),
    __metadata('design:returntype', Promise),
  ],
  Manager.prototype,
  'changeMinter_3',
  null,
);
//# sourceMappingURL=Manager.js.map

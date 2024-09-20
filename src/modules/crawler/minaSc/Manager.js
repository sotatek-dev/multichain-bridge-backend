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
    this.minter = State();
  }
  async deploy(args) {
    await super.deploy(args);
    this.minter.set(args._minter);
    this.admin.set(args._admin);
  }
  isAdmin(sender) {
    this.admin.getAndRequireEquals().assertEquals(sender);
  }
  isMinter(sender) {
    this.minter.getAndRequireEquals().assertEquals(sender);
  }
  async changeAdmin(_admin) {
    this.isAdmin(this.sender.getAndRequireSignature());
    this.admin.set(_admin);
  }
  async changeMinter(_minter) {
    this.isAdmin(this.sender.getAndRequireSignature());
    this.minter.set(_minter);
  }
}
__decorate([state(PublicKey), __metadata('design:type', Object)], Manager.prototype, 'admin', void 0);
__decorate([state(PublicKey), __metadata('design:type', Object)], Manager.prototype, 'minter', void 0);
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
  'changeMinter',
  null,
);
//# sourceMappingURL=Manager.js.map

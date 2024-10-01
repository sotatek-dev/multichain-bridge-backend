/* eslint-disable prettier/prettier */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { SmartContract, State, state, Field, method, PublicKey, } from 'o1js';
import { Manager } from './Manager.js';
export class ValidatorManager extends SmartContract {
  constructor() {
      super(...arguments);
      this.validator1 = State();
      this.validator2 = State();
      this.validator3 = State();
      this.manager = State();
  }
  async deploy(args) {
      await super.deploy(args);
      this.validator1.set(args._validator1);
      this.validator2.set(args._validator2);
      this.validator3.set(args._validator3);
      this.manager.set(args._manager);
  }
  isValidator(p) {
      return this.getValidatorIndex(p).greaterThan(Field(0));
  }
  getValidatorIndex(p) {
      if (this.compareValidators(p, this.validator1.getAndRequireEquals()))
          return Field.from(1);
      if (this.compareValidators(p, this.validator2.getAndRequireEquals()))
          return Field.from(2);
      if (this.compareValidators(p, this.validator3.getAndRequireEquals()))
          return Field.from(3);
      return Field.from(0);
  }
  compareValidators(p1, p2) {
      return p1.equals(p2);
  }
  async changeValidator(validator1, validator2, validator3) {
      const managerZkapp = new Manager(this.manager.getAndRequireEquals());
      managerZkapp.isAdmin(this.sender.getAndRequireSignature());
      this.validator1.set(validator1);
      this.validator2.set(validator2);
      this.validator3.set(validator3);
  }
}
__decorate([
  state(PublicKey),
  __metadata("design:type", Object)
], ValidatorManager.prototype, "validator1", void 0);
__decorate([
  state(PublicKey),
  __metadata("design:type", Object)
], ValidatorManager.prototype, "validator2", void 0);
__decorate([
  state(PublicKey),
  __metadata("design:type", Object)
], ValidatorManager.prototype, "validator3", void 0);
__decorate([
  state(PublicKey),
  __metadata("design:type", Object)
], ValidatorManager.prototype, "manager", void 0);
__decorate([
  method,
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [PublicKey,
      PublicKey,
      PublicKey]),
  __metadata("design:returntype", Promise)
], ValidatorManager.prototype, "changeValidator", null);
//# sourceMappingURL=ValidatorManager.js.map
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import { Bool, PublicKey, State, state, SmartContract, method, AccountUpdate, } from 'o1js';
import { AdminAction } from './interfaces/token/adminable.js';
class Hooks extends SmartContract {
    constructor() {
        super(...arguments);
        this.admin = State();
    }
    initialize(admin) {
        super.init();
        this.admin.getAndAssertEquals();
        this.admin.set(admin);
    }
    getAdmin({ preconditions } = Hooks.defaultViewableOptions) {
        const admin = this.admin.get();
        if (preconditions.shouldAssertEquals) {
            this.admin.assertEquals(admin);
        }
        return admin;
    }
    canAdmin(action) {
        const admin = this.admin.get();
        this.admin.assertEquals(admin);
        // example of disabling `setPaused`
        const actionPossible = action.type
            .equals(AdminAction.types.setPaused)
            .equals(Bool(false));
        actionPossible.assertTrue();
        const adminAccountUpdate = AccountUpdate.create(admin);
        adminAccountUpdate.requireSignature();
        return actionPossible;
    }
}
Hooks.defaultViewableOptions = {
    preconditions: { shouldAssertEquals: true },
};
__decorate([
    state(PublicKey),
    __metadata("design:type", Object)
], Hooks.prototype, "admin", void 0);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey]),
    __metadata("design:returntype", void 0)
], Hooks.prototype, "initialize", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminAction]),
    __metadata("design:returntype", Bool)
], Hooks.prototype, "canAdmin", null);
export default Hooks;
//# sourceMappingURL=Hooks.js.map
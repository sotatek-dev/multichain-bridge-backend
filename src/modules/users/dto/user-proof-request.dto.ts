import { StringField } from "../../../shared/decorators/field.decorator.js";


export class UserLockProofCreateJobDto {

    @StringField({ required: true })
    tokenAddress: string;

    @StringField({ required: true })
    address: string;

    @StringField({ required: true, number: true })
    amount: string;
}

export class UserLockProofFetchJobDto {

    @StringField({ required: true })
    jobId: string;
}
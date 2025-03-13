import { StringField } from "../../../shared/decorators/field.decorator.js";


export class SignSetMinMaxDto {
    @StringField({ number: true })
    min: string;

    @StringField({ number: true })
    max: string;

    @StringField()
    address: `B62${string}`
}

export class SignUnlockTxDto {
    @StringField({ number: true })
    amount: string;

    @StringField({})
    tokenAddress: `B62${string}`;

    @StringField()
    address: `B62${string}`
}
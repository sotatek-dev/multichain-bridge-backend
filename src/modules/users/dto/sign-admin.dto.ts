import { StringField } from "../../../shared/decorators/field.decorator.js";


export class SignSetMinMaxDto {
    @StringField({ number: true })
    min: string;

    @StringField({ number: true })
    max: string;

    @StringField()
    address: string
}
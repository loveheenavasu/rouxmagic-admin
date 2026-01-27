import { Flag } from "./common";

export interface Response<T = any, E = unknown> {
    error?:{
        output?:E;
        hints?:any,
        message?:string
    };
    data?:T;
    flag:Flag
}
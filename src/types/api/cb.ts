export interface OnSuccessCallback<Args = unknown>{
    onSuccess?:(data: Args) => void | Promise<void>
}
export interface OnFailCallback<Args = unknown>{
    onFail?:(err: Args) => void | Promise<void>
}
export interface OnLoadingStateChangeCallback{
    onLoadingStateChange?:(state:boolean) => void
}
export interface ValidatorCallback {
    validator?:()=>boolean
}

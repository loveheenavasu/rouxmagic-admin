import {
  OnFailCallback,
  OnLoadingStateChangeCallback,
  OnSuccessCallback,
} from "./args";

export type CommonCBArgs = {
  error?: unknown;
  data?: any;
  message?: string;
  flag?: any;
};

export interface CBArgs {
  onSuccessArgs: CommonCBArgs;
  onFailArgs: CommonCBArgs;
  handleLoadingState: boolean;
}

export interface Callbacks<Args extends CBArgs = CBArgs>
  extends OnSuccessCallback<Args["onSuccessArgs"]>,
    OnFailCallback<Args["onFailArgs"]>,
    OnLoadingStateChangeCallback {}

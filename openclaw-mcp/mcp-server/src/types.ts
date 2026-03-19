export interface ToolSuccess<T> {
  success: true;
  data: T;
  next_step?: string;
}

export interface ToolFailure {
  success: false;
  error: {
    code: string;
    message: string;
  };
  action_required?: string;
}

export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export function ok<T>(data: T, next_step?: string): ToolSuccess<T> {
  return next_step ? { success: true, data, next_step } : { success: true, data };
}

export function fail(code: string, message: string, action_required?: string): ToolFailure {
  return action_required
    ? { success: false, error: { code, message }, action_required }
    : { success: false, error: { code, message } };
}

export function toToolText<T>(result: ToolResult<T>): string {
  return JSON.stringify(result, null, 2);
}

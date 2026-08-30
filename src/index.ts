import { Dispatch, Reducer, useEffect, useReducer, useRef } from "react";

export type DispatchMiddleware<State, Action> = (
  action: Action,
  state: State,
) => void;

export interface UseReducerWithMiddlewareOptions<
  State,
  Action,
  InitialArg = State,
> {
  beforeDispatch?: readonly DispatchMiddleware<State, Action>[];
  afterDispatch?: readonly DispatchMiddleware<State, Action>[];
  initializer?: (initialArg: InitialArg) => State;
}

type MiddlewareConfig<State, Action, InitialArg> = {
  beforeDispatch: readonly DispatchMiddleware<State, Action>[];
  afterDispatch: readonly DispatchMiddleware<State, Action>[];
  initializer?: (initialArg: InitialArg) => State;
};

function normalizeOptions<State, Action, InitialArg>(
  optionsOrBefore?:
    | UseReducerWithMiddlewareOptions<State, Action, InitialArg>
    | readonly DispatchMiddleware<State, Action>[],
  legacyAfterDispatch?: readonly DispatchMiddleware<State, Action>[],
): MiddlewareConfig<State, Action, InitialArg> {
  const usesLegacySignature =
    Array.isArray(optionsOrBefore) || legacyAfterDispatch !== undefined;

  if (usesLegacySignature) {
    return {
      beforeDispatch: Array.isArray(optionsOrBefore) ? optionsOrBefore : [],
      afterDispatch: legacyAfterDispatch ?? [],
    };
  }

  const options =
    optionsOrBefore as
      | UseReducerWithMiddlewareOptions<State, Action, InitialArg>
      | undefined;

  return {
    beforeDispatch: options?.beforeDispatch ?? [],
    afterDispatch: options?.afterDispatch ?? [],
    initializer: options?.initializer,
  };
}

export function useReducerWithMiddleware<State, Action, InitialArg = State>(
  reducer: Reducer<State, Action>,
  initialArg: InitialArg,
  optionsOrBefore?:
    | UseReducerWithMiddlewareOptions<State, Action, InitialArg>
    | readonly DispatchMiddleware<State, Action>[],
  legacyAfterDispatch?: readonly DispatchMiddleware<State, Action>[],
): [State, Dispatch<Action>] {
  const { beforeDispatch, afterDispatch, initializer } = normalizeOptions(
    optionsOrBefore,
    legacyAfterDispatch,
  );

  const [state, dispatch] = initializer
    ? useReducer(reducer, initialArg, initializer)
    : useReducer(reducer, initialArg as unknown as State);

  const stateRef = useRef(state);
  const actionRef = useRef<Action | null>(null);
  const beforeDispatchRef = useRef(beforeDispatch);
  const afterDispatchRef = useRef(afterDispatch);

  stateRef.current = state;
  beforeDispatchRef.current = beforeDispatch;
  afterDispatchRef.current = afterDispatch;

  useEffect(() => {
    if (actionRef.current === null) {
      return;
    }

    const action = actionRef.current;
    actionRef.current = null;

    for (const middleware of afterDispatchRef.current) {
      middleware(action, state);
    }
  }, [state]);

  const dispatchWithMiddleware: Dispatch<Action> = (action) => {
    for (const middleware of beforeDispatchRef.current) {
      middleware(action, stateRef.current);
    }

    actionRef.current = action;
    dispatch(action);
  };

  return [state, dispatchWithMiddleware];
}

export default useReducerWithMiddleware;

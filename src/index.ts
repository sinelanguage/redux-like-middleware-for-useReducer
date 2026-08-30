import { Dispatch, Reducer, useCallback, useEffect, useReducer, useRef } from "react";

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

function defaultInitializer<State, InitialArg>(initialArg: InitialArg): State {
  return initialArg as unknown as State;
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

  const [state, dispatch] = useReducer(
    reducer,
    initialArg,
    initializer ?? defaultInitializer<State, InitialArg>,
  );

  const stateRef = useRef(state);
  const batchStartStateRef = useRef<State | null>(null);
  const actionQueueRef = useRef<Action[]>([]);
  const beforeDispatchRef = useRef(beforeDispatch);
  const afterDispatchRef = useRef(afterDispatch);

  stateRef.current = state;
  beforeDispatchRef.current = beforeDispatch;
  afterDispatchRef.current = afterDispatch;

  useEffect(() => {
    if (actionQueueRef.current.length === 0) {
      return;
    }

    const queuedActions = actionQueueRef.current;
    const batchStartState = batchStartStateRef.current ?? state;

    actionQueueRef.current = [];
    batchStartStateRef.current = null;

    let nextState = batchStartState;

    for (const action of queuedActions) {
      nextState = reducer(nextState, action);

      for (const middleware of afterDispatchRef.current) {
        middleware(action, nextState);
      }
    }
  }, [reducer, state]);

  const dispatchWithMiddleware = useCallback<Dispatch<Action>>((action) => {
    for (const middleware of beforeDispatchRef.current) {
      middleware(action, stateRef.current);
    }

    if (actionQueueRef.current.length === 0) {
      batchStartStateRef.current = stateRef.current;
    }

    actionQueueRef.current.push(action);
    dispatch(action);
  }, [dispatch]);

  return [state, dispatchWithMiddleware];
}

export default useReducerWithMiddleware;

import { useReducer, useRef, useEffect } from "react";
import "./styles.css";

// custom hook to run middleware for userReducer hook
const useReducerWithMiddleware = (
  reducer,
  initialState,
  middlewares,
  afterDispatchMiddleWares
) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const currentRef = useRef();
  useEffect(() => {
    if (!currentRef.current) return;
    afterDispatchMiddleWares.map((middleware) =>
      middleware(currentRef.current, state)
    );
  }, [afterDispatchMiddleWares, state]);

  const dispatchUsingMiddleware = (action) => {
    middlewares.map((middleware) => middleware(action, state));
    currentRef.current = action;
    dispatch(action);
  };
  return [state, dispatchUsingMiddleware];
};

export default function App() {
  let reducer = (state) => {
    return { count: state.count + 1 };
  };
  const logPreviousState = (action, state) => {
    console.log(`count before ${action}: ${state.count}`);
  };
  const logFutureState = (action, state) => {
    console.log(`count after ${action}: ${state.count}`);
  };
  const [state, dispatch] = useReducerWithMiddleware(
    reducer,
    { count: 0 },
    [logPreviousState],
    [logFutureState]
  );
  return (
    <div className="App">
      <span>{state.count}</span>
      <button onClick={() => dispatch("increment")}>Increment Count</button>
    </div>
  );
}

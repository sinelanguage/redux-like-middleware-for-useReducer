import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useReducerWithMiddleware } from "../src/index";

type CounterAction =
  | { type: "increment" }
  | { type: "add"; value: number };

type CounterState = { count: number };

const counterReducer = (
  state: CounterState,
  action: CounterAction,
): CounterState => {
  switch (action.type) {
    case "increment":
      return { count: state.count + 1 };
    case "add":
      return { count: state.count + action.value };
    default:
      return state;
  }
};

describe("useReducerWithMiddleware", () => {
  it("runs middleware before and after dispatch", () => {
    const beforeDispatch = vi.fn();
    const afterDispatch = vi.fn();

    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 0 }, {
        beforeDispatch: [beforeDispatch],
        afterDispatch: [afterDispatch],
      }),
    );

    act(() => {
      result.current[1]({ type: "increment" });
    });

    expect(result.current[0]).toEqual({ count: 1 });
    expect(beforeDispatch).toHaveBeenCalledWith(
      { type: "increment" },
      { count: 0 },
    );
    expect(afterDispatch).toHaveBeenCalledWith(
      { type: "increment" },
      { count: 1 },
    );
  });

  it("supports the legacy positional middleware signature", () => {
    const beforeDispatch = vi.fn();
    const afterDispatch = vi.fn();

    const { result } = renderHook(() =>
      useReducerWithMiddleware(
        counterReducer,
        { count: 2 },
        [beforeDispatch],
        [afterDispatch],
      ),
    );

    act(() => {
      result.current[1]({ type: "add", value: 3 });
    });

    expect(result.current[0]).toEqual({ count: 5 });
    expect(beforeDispatch).toHaveBeenCalledWith(
      { type: "add", value: 3 },
      { count: 2 },
    );
    expect(afterDispatch).toHaveBeenCalledWith(
      { type: "add", value: 3 },
      { count: 5 },
    );
  });

  it("supports an initializer for lazy state creation", () => {
    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, 4, {
        initializer: (count) => ({ count }),
      }),
    );

    act(() => {
      result.current[1]({ type: "increment" });
    });

    expect(result.current[0]).toEqual({ count: 5 });
  });

  it("runs after-dispatch middleware for each batched action", () => {
    const afterDispatch = vi.fn();

    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 0 }, {
        afterDispatch: [afterDispatch],
      }),
    );

    act(() => {
      result.current[1]({ type: "increment" });
      result.current[1]({ type: "increment" });
    });

    expect(result.current[0]).toEqual({ count: 2 });
    expect(afterDispatch).toHaveBeenNthCalledWith(
      1,
      { type: "increment" },
      { count: 2 },
    );
    expect(afterDispatch).toHaveBeenNthCalledWith(
      2,
      { type: "increment" },
      { count: 2 },
    );
  });
});

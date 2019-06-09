import {RequestInput} from "@cycle/http";
import Stream from "xstream";
import {getCollateral, getState} from "../../../http";

export const request = (): Stream<RequestInput> => {
    const collateral = Stream.periodic(15000).mapTo(getCollateral()).startWith(getCollateral());
    const state = Stream.periodic(30000).mapTo(getState()).startWith(getState());

    return Stream.merge(collateral, state);
};

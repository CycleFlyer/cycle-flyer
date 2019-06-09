import {DOMSource, VNode} from "@cycle/dom";
import {HTTPSource, RequestInput} from "@cycle/http";
import isolate from "@cycle/isolate";
import {StorageRequest, StorageSource} from "@cycle/storage";
import {Reducer, StateSource} from "cycle-onionify";
import {HistoryAction, RouterSource} from "cyclic-router";
import Stream from "xstream";
import {SocketIOSource} from "../../drivers/socketIODriver";
import {IFDOCOrder} from "../../models/ifdocoOrder";
import {Order} from "../../models/order";
import {OrderHistory} from "../../models/orderHistory";
import {Position} from "../../models/position";
import {StopOrder} from "../../models/stopOrder";
import {BoardComponent, State as BoardComponentState} from "./board/index";
import "./index.styl";
import {intent} from "./intent";
import {model} from "./model";
import {request} from "./request";
import {State as SummaryComponentState} from "./summary";
import {SummaryComponent} from "./summary/index";
import {view} from "./view";

export interface Sources {
    DOM: DOMSource;
    HTTP: HTTPSource;
    onion: StateSource<object>;
    router: RouterSource;
    socket: SocketIOSource;
    storage: StorageSource;
}

export interface Sinks {
    DOM: Stream<VNode>;
    HTTP: Stream<RequestInput|null>;
    onion: Stream<Reducer<object>>;
    router: Stream<HistoryAction>;
    storage: Stream<StorageRequest>;
}

export interface State {
    currentPrice: number;
    histories: OrderHistory[];
    isOrdering: boolean;
    orders: Order[];
    position: Position;
    price: number;
    size: number;
    stopOrders: StopOrder[];
    ifdocoOrder: IFDOCOrder;
    boardComponentState?: BoardComponentState;
    summaryComponentState?: SummaryComponentState;
}

export const Trade = (sources: Sources): Sinks => {
    const summaryComponent = isolate(SummaryComponent, {
        "*": "summaryComponent",
        "onion": {
            get: (state: State) => state.summaryComponentState && {
                ...state.summaryComponentState,
                currentPrice: state.currentPrice,
                histories: state.histories,
                position: state.position,
            },
            set: (state: State, summaryComponentState: SummaryComponentState) => ({
                ...state,
                position: summaryComponentState.position,
                summaryComponentState,
            }),
        },
    })(sources);

    const boardComponent = isolate(BoardComponent, {
        "*": "boardComponent",
        "onion": {
            get: (state: State) => state.boardComponentState && {
                ...state.boardComponentState,
                currentPrice: state.currentPrice,
                orders: state.orders,
                position: state.position,
                price: state.price,
                stopOrders: state.stopOrders,
            },
            set: (state: State, boardComponentState: BoardComponentState) => ({
                ...state,
                boardComponentState,
                price: boardComponentState.price,
            }),
        },
    })(sources);

    const actions = intent(sources);
    const reducer$ = model(actions);
    const view$ = view(sources.onion.state$, boardComponent.DOM, summaryComponent.DOM);
    const request$ = request(actions, sources.onion.state$);

    return {
        DOM: view$,
        HTTP: Stream.merge(request$, boardComponent.HTTP, summaryComponent.HTTP),
        onion: Stream.merge(reducer$, boardComponent.onion, summaryComponent.onion),
        router: Stream.empty(),
        storage: Stream.empty(),
    };
};

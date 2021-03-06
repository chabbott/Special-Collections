import React from "react";
import ReactDOM from "react-dom";
import { MainRouter } from "./route/Routers";
import * as serviceWorker from "./serviceWorker";

import { Provider } from "react-redux";
import store from "./redux/store";

import 'primereact/resources/themes/mdc-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import './assets/css/SpecialCollections.css';

import PrimeReact from 'primereact/api';

PrimeReact.ripple = true;

ReactDOM.render(
  <Provider store={store}>
    <MainRouter />
  </Provider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

// eventEmitter.js
export const events = new EventTarget();

export const emit = (eventName, detail) => {
    events.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const on = (eventName, callback) => {
    events.addEventListener(eventName, callback);
};
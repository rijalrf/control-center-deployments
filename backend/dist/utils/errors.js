"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
exports.getApiErrorMessage = getApiErrorMessage;
/**
 * Safely extracts an error message from an unknown error value.
 * Use this in catch blocks where the error type is `unknown`.
 */
function getErrorMessage(err, fallback = 'An unexpected error occurred') {
    if (err instanceof Error)
        return err.message;
    if (typeof err === 'string')
        return err;
    return fallback;
}
/**
 * Extracts a user-facing API error message from an Axios-style error response.
 * Falls back to `getErrorMessage` for non-Axios errors.
 */
function getApiErrorMessage(err, fallback) {
    if (err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'error' in err.response.data &&
        typeof err.response.data.error === 'string') {
        return err.response.data.error;
    }
    return getErrorMessage(err, fallback);
}

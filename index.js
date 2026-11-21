/**
 * Host half of the sidebar-balance bundle.
 *
 * The balance is read entirely from the client half through the app's own
 * `remote.account` namespace, so nothing is mounted here on purpose: a Host
 * half that declared `inject: ['deepseekAccount']` would never apply against a
 * host build that does not ship that service.
 */
export function apply() {}

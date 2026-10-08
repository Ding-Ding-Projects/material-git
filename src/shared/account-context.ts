import type {AuthState,AuthAccount} from './types.js';
/** Native status selects the host; an environment identity takes precedence even when invalid. */
export function activeHostAccount(state:AuthState):AuthAccount|undefined {
 const hostname=state.selectedHostname;
 if(!hostname||!state.allowedHosts.includes(hostname))return;
 const active=state.accounts.filter(account=>account.host===hostname&&account.active);
 return active.find(account=>account.tokenSource==='environment')??active.find(account=>account.state==='success')??active[0];
}

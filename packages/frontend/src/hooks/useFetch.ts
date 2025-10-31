import { useState } from "react";
import useSnackbar from "../components/SnackbarContext";

// Example usage 
// Requst type: MyRequest
// Response type: ApiResponse
// MyRequestHook = useFetch<MyRequest, ApiResponse>(url, 'get')
// Where
// MyRequestHoot type = 
// {
//  data: ApiResponse | null, null by default until successful response
//  isPending: boolean, true if waiting for request 
//  error: any | null, null by default until request error 
//  makeRequest: (MyRequest) => Promise<ApiResponse|false>, if request errors response with false
// }
const useFetch = <Message, Response>(url: string, method: 'get' | 'post' | 'put' | 'delete', successMessage: string | null = null) => {
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<string>(null)
    const [data, setData] = useState<Response | null>(null)
    const { setSnack } = useSnackbar()

    const makeRequest = async (data?: Message) => {
        const options = {
            method: method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        };
        setIsPending(true);
        try {
            const res = await fetch(url, options);
            const contentType = res.headers.get('content-type');
            let data;
            if (contentType && contentType.indexOf('application/json') !== -1) {
                data = await res.json();
            }
            if (!res.ok) {
                const errorMsg = data?.error ? `: ${data.error}` : '';
                throw Error(`Error making request: ${res.status.toString()}${errorMsg}`);
            }
            setData(data);
            setIsPending(false);
            setError(null);
            if (successMessage !== null) {
                setSnack({
                    message: successMessage,
                    severity: 'success',
                    open: true,
                    autoHideDuration: 6000,
                });
            }
            return data as Response;
        } catch (err) {
            setSnack({
                message: err.message ? err.message : 'Unknown error',
                severity: "error",
                open: true,
                autoHideDuration: null
            });
            setIsPending(false);
            setError(err.message ? err.message : 'Unknown error');
            return false;
        }
    }
    return { data, isPending, error, makeRequest };
};

export default useFetch;

import { testMockUserStore } from "../auth/test/TestMockUserStore";
import { testDBCounter } from "./DBTest";

export async function tempTestSuite(): Promise<string> {

    const tests = [
        testMockUserStore(),
        testDBCounter()
    ];

    const combine = await Promise.all(tests);
    return "Test Results:  " + combine.join(",  ");
}

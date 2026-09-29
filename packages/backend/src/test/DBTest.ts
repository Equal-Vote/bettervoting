import { orDefault } from "../Util";
import { DemoPGStore } from "./DemoPGStore";

import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


export async function testDBCounter(): Promise<string> {
    console.info("testDBCounter");
    var myKey = "testDBCounter";

    var demodb = new DemoPGStore(pool, "demopgstore");
    return demodb.init().then(() => {
        return demodb.get(myKey);
    }).then((num:string | null) => {    
        return parseInt(orDefault(num, "0"));
    }).then((count:number) => {
        count++;
        var str = JSON.stringify(count);
        return demodb.set(myKey, str);
    }).then((res:string) => {
        return "testDBCounter vaue = " + res;
    });
}
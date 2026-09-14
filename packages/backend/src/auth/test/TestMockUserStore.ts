import { UserModel } from "../data_model/UserModel";
import { MockUserStore } from "../MockUserStore";


export async function testMockUserStore(): Promise<string> {

    var store = new MockUserStore();

    var user1 = new UserModel({
        email: "test1@test.com",
        id: "1",
        hashedPassword: "asdf",
        salt: "asdf"
    });

    var user2 = user1.copy();
    user2.email = "test2@test.com";
    user2.id = "2";

    await store.set(user1);
    await store.set(user2);

    var res = await store.getByEmail(user1.email);
    res = assertNotNull(res, "getByEmail should not be null");
    assertSame(res.toJson(), user1.toJson(), "getByEmail should return matching user");

    res = await store.getById(user2.id);
    res = assertNotNull(res, "getById should not be null");
    assertSame(res.toJson(), user2.toJson(), "getById should return matching user");

    var oldEmail = user1.email;
    user1.email = "another@test.com";
    await store.set(user1);

    res = await store.getByEmail(oldEmail);
    assertSame(res, null, "getByEmail should be null after the user's email was changed");

    return "testMockUserStore -> pass";
}


function assertSame(data1:unknown, data2:unknown, message:string) {
    if (data1 != data2){
        throw(new Error(`${message}\n${JSON.stringify(data1)} != ${JSON.stringify(data2)}`));
    }
}

function assertNotNull<Type>(data:Type|null, message:string):Type {
    if (data == null){
        throw(new Error(message));
    }
    return data;
}
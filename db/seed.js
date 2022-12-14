const { client, getAllUsers, createUser } = require("./index");

const dropTables = async () => {
  try {
    console.log("Dropping tables");

    await client.query(`
        DROP TABLE IF EXISTS users;
      `);

    console.log("Tables dropped");
  } catch (error) {
    console.error("Error dropping tables");
    throw error;
  }
};

const createTables = async () => {
  try {
    console.log("Building tables");

    await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username varchar(255) UNIQUE NOT NULL,
          password varchar(255) NOT NULL
        );
      `);

    console.log("Tables built");
  } catch (error) {
    console.error("Error building tables");
    throw error;
  }
};

const createInitialUsers = async () => {
  try {
    console.log("Creating users...");

    const glamgal = await createUser({
      username: "glamgal",
      password: "soglam",
    });

    const sandra = await createUser({
      username: "sandra",
      password: "2sandy4me",
    });

    const albert = await createUser({
      username: "albert",
      password: "bertie99",
    });
    console.log("Users created!");
  } catch (error) {
    console.error("Error creating users!");
    throw error;
  }
};

const rebuildDB = async () => {
  try {
    client.connect();

    await dropTables();
    await createTables();
    await createInitialUsers();
  } catch (error) {
    throw error;
  }
};

const testDB = async () => {
  try {
    console.log("Testing database...");

    const users = await getAllUsers();
    console.log("getAllUsers:", users);

    console.log("Finished database tests");
  } catch (error) {
    console.error("Error testing database");
    throw error;
  }
};

rebuildDB()
  .then(testDB)
  .catch(console.error)
  .finally(() => client.end());

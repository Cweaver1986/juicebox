const {
  client,
  getAllUsers,
  createUser,
  updateUser,
  createPost,
  updatePost,
  getAllPosts,
  getUserById,
  getPostsByTagName,
} = require("./index");

// drops all tables (if they exist)
const dropTables = async () => {
  try {
    console.log("Dropping tables");

    await client.query(`
      DROP TABLE IF EXISTS post_tags;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS posts;
      DROP TABLE IF EXISTS users;
      `);

    console.log("Tables dropped");
  } catch (error) {
    console.error("Error dropping tables");
    throw error;
  }
};

//creates new tables
const createTables = async () => {
  try {
    console.log("Building tables");

    await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          location VARCHAR(255) NOT NULL,
          active BOOLEAN DEFAULT true
        );
       
        CREATE TABLE posts (
          id SERIAL PRIMARY KEY,
          "authorId" INTEGER REFERENCES users(id) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          active BOOLEAN DEFAULT true
          );

        CREATE TABLE tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL
          );
          
        CREATE TABLE post_tags (
          "postId" INTEGER REFERENCES posts(id),
          "tagId" INTEGER REFERENCES tags(id),
          UNIQUE ("postId","tagId")
          );

    `);

    console.log("Tables built");
  } catch (error) {
    console.error("Error building tables");
    throw error;
  }
};

//creates initial users
async function createInitialUsers() {
  try {
    console.log("Creating users...");

    const albert = await createUser({
      username: "albert",
      password: "bertie99",
      name: "",
      location: "",
    });

    const sandra = await createUser({
      username: "sandra",
      password: "2sandy4me",
      name: "",
      location: "",
    });

    const glamgal = await createUser({
      username: "glamgal",
      password: "soglam",
      name: "",
      location: "",
    });

    console.log("Users created!");
  } catch (error) {
    console.error("Error creating users!");
    throw error;
  }
}

//creates initial posts
async function createInitialPosts() {
  try {
    const [albert, sandra, glamgal] = await getAllUsers();

    console.log("Starting to create posts...");
    await createPost({
      authorId: albert.id,
      title: "First Post",
      content:
        "This is my first post. I hope I love writing blogs as much as I love writing them.",
      tags: ["#happy", "#youcandoanything"],
    });

    await createPost({
      authorId: sandra.id,
      title: "How does this work?",
      content: "Seriously, does this even do anything?",
      tags: ["#happy", "#worst-day-ever"],
    });

    await createPost({
      authorId: glamgal.id,
      title: "Living the Glam Life",
      content: "Do you even? I swear that half of you are posing.",
      tags: ["#happy", "#youcandoanything", "#canmandoeverything"],
    });
    console.log("Finished creating posts!");
  } catch (error) {
    console.log("Error creating posts!");
    throw error;
  }
}

//calls all functions to rebuild the database
const rebuildDB = async () => {
  try {
    client.connect();

    await dropTables();
    await createTables();
    await createInitialUsers();
    await createInitialPosts();
  } catch (error) {
    console.log("Error rebuilding DB");
    throw error;
  }
};

//simple function to test database is working properly
const testDB = async () => {
  try {
    console.log("Starting to test database...");

    console.log("Calling getAllUsers");
    const users = await getAllUsers();
    console.log("Result:", users);

    console.log("Calling updateUser on users[0]");
    const updateUserResult = await updateUser(users[0].id, {
      name: "Newname Sogood",
      location: "Lesterville, KY",
    });
    console.log("Result:", updateUserResult);

    console.log("Calling getAllPosts");
    const posts = await getAllPosts();
    console.log("Result:", posts);

    console.log("Calling updatePost on posts[0]");
    const updatePostResult = await updatePost(posts[0].id, {
      title: "New Title",
      content: "Updated Content",
    });
    console.log("Result:", updatePostResult);

    console.log("Calling updatePost on posts[1], only updating tags");
    const updatePostTagsResult = await updatePost(posts[1].id, {
      tags: ["#youcandoanything", "#redfish", "#bluefish"],
    });
    console.log("Result:", updatePostTagsResult);

    console.log("Calling getUserById with 1");
    const albert = await getUserById(1);
    console.log("Result:", albert);

    console.log("Calling getPostsByTagName with #happy");
    const postsWithHappy = await getPostsByTagName("#happy");
    console.log("Result:", postsWithHappy);

    console.log("Finished database tests!");
  } catch (error) {
    console.log("Error during testDB");
    throw error;
  }
};

rebuildDB()
  .then(testDB)
  .catch(console.error)
  .finally(() => client.end());

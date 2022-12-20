const { Client } = require("pg");

const client = new Client("postgres://localhost:5432/juicebox-dev");

/******************************* Users ********************************/

//function to get all users from database
const getAllUsers = async () => {
  const { rows } = await client.query(`
    SELECT id, username, name, location, active
    FROM users;
    `);
  return rows;
};

//creates a new user
const createUser = async ({ username, password, name, location }) => {
  try {
    const {
      rows: [user],
    } = await client.query(
      `
      INSERT INTO users(username, password, name, location)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
      RETURNING *;
      `,
      [username, password, name, location]
    );
    return user;
  } catch (error) {
    throw error;
  }
};

//updates existing user
const updateUser = async (id, fields = {}) => {
  //creates a string for the 'SET' keyword
  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 1}`)
    .join(", ");
  //if no setString do nothing
  if (setString.length === 0) {
    return;
  }
  //if setString do this
  try {
    const {
      rows: [user],
    } = await client.query(
      `
        UPDATE users
        SET ${setString}
        WHERE id=${id}
        RETURNING *;
        `,
      Object.values(fields)
    );

    return user;
  } catch (error) {
    throw error;
  }
};

//gets specific user based on a userId
const getUserById = async (userId) => {
  try {
    const {
      rows: [user],
    } = await client.query(`
        SELECT * FROM users
        WHERE id = ${userId}
        `);
    //deletes the password key from the user object
    delete user.password;
    //assigns posts key to user object based on the userId
    user.posts = await getPostsByUser(userId);
    return user;
  } catch (error) {
    throw error;
  }
};

//gets specific user based on username
const getUserByUsername = async (username) => {
  try {
    const {
      rows: [user],
    } = await client.query(
      `
      SELECT *
      FROM users
      WHERE username=$1;
    `,
      [username]
    );

    return user;
  } catch (error) {
    throw error;
  }
};
/******************************* Posts ********************************/

//get all posts from database
async function getAllPosts() {
  try {
    const { rows: postIds } = await client.query(`
        SELECT id
        FROM posts;
        `);
    //maps out each individual post based on the id
    const posts = await Promise.all(
      postIds.map((post) => getPostById(post.id))
    );

    return posts;
  } catch (error) {
    throw error;
  }
}

//creates new post in database
const createPost = async ({ authorId, title, content, tags = [] }) => {
  try {
    const {
      rows: [post],
    } = await client.query(
      `
            INSERT INTO posts("authorId", title, content)
            VALUES ($1, $2, $3)
            RETURNING *;
            `,
      [authorId, title, content]
    );
    //adds tags to taglist array and then adds tags to the post based on id using taglist array
    const tagList = await createTags(tags);
    return await addTagsToPost(post.id, tagList);
  } catch (error) {
    throw error;
  }
};

//updates existing post
const updatePost = async (postId, fields = {}) => {
  // read off the tags & remove that field
  const { tags } = fields; // might be undefined
  delete fields.tags;

  // build the set string
  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 1}`)
    .join(", ");

  try {
    // update any fields that need to be updated
    if (setString.length > 0) {
      await client.query(
        `
          UPDATE posts
          SET ${setString}
          WHERE id=${postId}
          RETURNING *;
        `,
        Object.values(fields)
      );
    }

    // return early if there's no tags to update
    if (tags === undefined) {
      return await getPostById(postId);
    }

    // make any new tags that need to be made
    const tagList = await createTags(tags);
    const tagListIdString = tagList.map((tag) => `${tag.id}`).join(", ");

    // delete any post_tags from the database which aren't in that tagList
    await client.query(
      `
        DELETE FROM post_tags
        WHERE "tagId"
        NOT IN (${tagListIdString})
        AND "postId"=$1;
      `,
      [postId]
    );

    // and create post_tags as necessary
    await addTagsToPost(postId, tagList);

    return await getPostById(postId);
  } catch (error) {
    throw error;
  }
};

//grabs all posts by specific user using userId
const getPostsByUser = async (userId) => {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id 
      FROM posts 
      WHERE "authorId"=${userId};
    `);

    //adds all posts to posts object
    const posts = await Promise.all(
      postIds.map((post) => getPostById(post.id))
    );

    return posts;
  } catch (error) {
    throw error;
  }
};

//grabs specific post based on postId
const getPostById = async (postId) => {
  try {
    const {
      rows: [post],
    } = await client.query(
      `
    SELECT * FROM posts
    WHERE id = $1;
    `,
      [postId]
    );

    if (!post) {
      throw {
        name: "PostNotFoundError",
        message: "Could not find a post with that postId",
      };
    }

    //grabs tags for post where postId and tagId are the same
    const { rows: tags } = await client.query(
      `
    SELECT tags.* FROM tags
    JOIN post_tags ON tags.id=post_tags."tagId"
    WHERE post_tags."postId"=$1;
    `,
      [postId]
    );

    const {
      rows: [author],
    } = await client.query(
      `
    SELECT id, username, name, location
    FROM users
    WHERE id=$1;
    `,
      [post.authorId]
    );
    //adds tags and author keys to post object
    post.tags = tags;
    post.author = author;
    //deletes authorId key from post object
    delete post.authorId;

    return post;
  } catch (error) {
    throw error;
  }
};

/******************************* Tags ********************************/

//gets all tags
const getAllTags = async () => {
  const { rows } = await client.query(`
  SELECT * FROM tags
  `);
  return rows;
};

//creates new tag
const createTags = async (tagList) => {
  if (tagList.length === 0) {
    return;
  }
  const insertValues = tagList.map((_, index) => `$${index + 1}`).join("), (");
  const selectValues = tagList.map((_, index) => `$${index + 1}`).join(", ");
  try {
    await client.query(
      `
    INSERT INTO tags(name)
    VALUES (${insertValues})
    ON CONFLICT (name) DO NOTHING;`,
      tagList
    );

    const { rows: tags } = await client.query(
      `SELECT * FROM tags
    WHERE name
    IN (${selectValues})
    `,
      tagList
    );
    console.log("this is rows", tags);
    return tags;
  } catch (error) {
    throw error;
  }
};

//adds tags into crossover table to be matched using postId and tagId
const createPostTag = async (postId, tagId) => {
  try {
    await client.query(
      `
      INSERT INTO post_tags("postId", "tagId")
      VALUES ($1, $2)
      ON CONFLICT ("postId", "tagId") DO NOTHING;
    `,
      [postId, tagId]
    );
  } catch (error) {
    throw error;
  }
};

//adds tags to post
const addTagsToPost = async (postId, tagList) => {
  try {
    const createPostTagPromises = tagList.map((tag) =>
      createPostTag(postId, tag.id)
    );

    await Promise.all(createPostTagPromises);

    return await getPostById(postId);
  } catch (error) {
    throw error;
  }
};

//gets posts based on specific tag names
const getPostsByTagName = async (tagName) => {
  try {
    const { rows: postIds } = await client.query(
      `
      SELECT posts.id
      FROM posts
      JOIN post_tags ON posts.id=post_tags."postId"
      JOIN tags ON tags.id=post_tags."tagId"
      WHERE tags.name=$1;
    `,
      [tagName]
    );

    return await Promise.all(postIds.map((post) => getPostById(post.id)));
  } catch (error) {
    throw error;
  }
};

module.exports = {
  client,
  getAllUsers,
  createUser,
  updateUser,
  createPost,
  updatePost,
  getAllPosts,
  getUserById,
  getPostsByTagName,
  getAllTags,
  getUserByUsername,
  getPostById,
};

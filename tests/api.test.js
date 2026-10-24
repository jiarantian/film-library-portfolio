const request = require("supertest");
const app = require("../server");

describe("Film Library API", () => {
  test("GET /api/films returns JSON list (200)", async () => {
    const res = await request(app).get("/api/films");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("GET /api/films/:id returns 404 when not found", async () => {
    const res = await request(app).get("/api/films/999999");
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/films returns 403 without token", async () => {
    const res = await request(app).post("/api/films").send({
      title: "Test Film",
      year: 2020,
      genre: "Drama",
      status: "watchlist",
      posterUrl: "",
      description: "test"
    });

    expect(res.statusCode).toBe(403);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/films returns 403 with wrong token", async () => {
    const res = await request(app)
      .post("/api/films")
      .set("x-admin-token", "wrong")
      .send({
        title: "Test Film",
        year: 2020,
        genre: "Drama",
        status: "watchlist",
        posterUrl: "",
        description: "test"
      });

    expect(res.statusCode).toBe(403);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/films returns 400 with valid token but missing fields", async () => {
    const res = await request(app)
      .post("/api/films")
      .set("x-admin-token", "letmein")
      .send({ title: "Bad Film" });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("error");
  });
});


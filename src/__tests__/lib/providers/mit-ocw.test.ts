import { afterEach, describe, expect, it, vi } from "vitest";
import { MitOpenCourseWareProvider } from "@/lib/providers/mit-ocw";

describe("MitOpenCourseWareProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps MIT OCW course cards into free course listings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `
        <div class="course-card card bg-white">
          <a href="/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/" aria-hidden="true"></a>
          <div class="course-card-content">
            <img src="/courses/6-0001/cover.jpg" />
            <div class="course-card-title">
              <a href="/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/">Introduction to Computer Science and Programming in Python</a>
            </div>
            <div class="course-card-instructors">Prof. Ana Bell</div>
            <div class="course-card-topics">
              <a>Engineering</a>
              <a>Computer Science</a>
            </div>
          </div>
        </div>
      `,
    } as Response);

    const provider = new MitOpenCourseWareProvider({ slug: "mit-ocw", name: "MIT OpenCourseWare" });
    const listings = await provider.fetchListings();

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      externalId: "mit-ocw-6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016",
      type: "course",
      title: "Introduction to Computer Science and Programming in Python",
      url: "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
      image: "https://ocw.mit.edu/courses/6-0001/cover.jpg",
      price: 0,
      priceLabel: "Free",
      categorySlug: "coding-tech",
    });
    expect(listings[0].description).toContain("Prof. Ana Bell");
  });

  it("keeps category inference scoped to the matching course card", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `
        <div class="course-card card bg-white">
          <div class="course-card-title">
            <a href="/courses/sts-050-the-history-of-mit-spring-2016/">The History of MIT</a>
          </div>
          <div class="course-card-topics"><a>History</a></div>
        </div>
        <div class="course-card card bg-white">
          <div class="course-card-title">
            <a href="/courses/18-s191-introduction-to-computational-thinking-fall-2022/">Introduction to Computational Thinking</a>
          </div>
          <div class="course-card-topics"><a>Computer Science</a></div>
        </div>
      `,
    } as Response);

    const provider = new MitOpenCourseWareProvider({ slug: "mit-ocw", name: "MIT OpenCourseWare" });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      title: "The History of MIT",
      categorySlug: "online-courses",
    });
    expect(listings[1]).toMatchObject({
      title: "Introduction to Computational Thinking",
      categorySlug: "coding-tech",
    });
  });
});

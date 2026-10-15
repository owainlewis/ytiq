import assert from "node:assert/strict"
import { mock, test } from "node:test"

const invalidations = []
const errors = []
const client = { invalidateQueries: (options) => invalidations.push(options) }
mock.module("@tanstack/react-query", {
  namedExports: {
    keepPreviousData: (data) => data,
    useQuery: (options) => options,
    useMutation: (options) => options,
    useQueryClient: () => client,
  },
})
mock.module("sonner", {
  namedExports: { toast: { success: () => {}, error: (message) => errors.push(message) } },
})

const { useAddChannel, useBoardItem, useCreateBoard, useRefreshAll, useUpdateNote, useVideos } = await import("../src/lib/api.ts")

test("All time omits unsupported query parameters on the real videos hook", async () => {
  const requests = []
  const fetch = mock.method(globalThis, "fetch", async (url) => {
    requests.push(url)
    return Response.json([])
  })
  try {
    const filters = { sort: "score", days: "all", channel_id: "all", shorts: false, q: "", min_score: "2", limit: 60 }
    const query = useVideos(filters)
    assert.deepEqual(query.queryKey, ["videos", filters])
    assert.deepEqual(await query.queryFn(), [])
    assert.deepEqual(requests, ["/api/videos?sort=score&min_score=2&limit=60"])

    await useVideos({ days: "90", shorts: true, limit: 0 }).queryFn()
    assert.equal(requests[1], "/api/videos?days=90&shorts=true&limit=0")
  } finally {
    fetch.mock.restore()
  }
})

test("mutations send JSON and invalidate the matching query keys", async () => {
  const requests = []
  const fetch = mock.method(globalThis, "fetch", async (url, options) => {
    requests.push([url, options])
    return Response.json({ id: 3, title: "New channel", name: "Ideas" })
  })
  try {
    const add = useAddChannel()
    const channel = await add.mutationFn("@creator")
    add.onSuccess(channel)
    assert.equal(requests[0][0], "/api/channels")
    assert.equal(requests[0][1].method, "POST")
    assert.equal(requests[0][1].headers["Content-Type"], "application/json")
    assert.deepEqual(JSON.parse(requests[0][1].body), { input: "@creator" })
    assert.deepEqual(invalidations.pop(), undefined)

    useRefreshAll().onSuccess()
    assert.deepEqual(invalidations.pop(), { queryKey: ["status"] })

    useCreateBoard().onSuccess()
    assert.deepEqual(invalidations.pop(), { queryKey: ["boards"] })

    const note = useUpdateNote()
    await note.mutationFn({ boardId: 3, videoId: "v42", note: "Hook" })
    note.onSuccess({}, { boardId: 3, videoId: "v42" })
    assert.deepEqual(requests[1][0], "/api/boards/3/items/v42")
    assert.deepEqual(invalidations.splice(0), [
      { queryKey: ["boards", "3"] },
      { queryKey: ["video", "v42"] },
    ])
  } finally {
    fetch.mock.restore()
  }
})

test("DELETE without a JSON body handles 204 and API errors show a toast", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }))
  try {
    const item = useBoardItem()
    assert.equal(await item.mutationFn({ boardId: 3, video: "v42", remove: true }), null)
    assert.equal(fetch.mock.calls[0].arguments[0], "/api/boards/3/items/v42")
    assert.equal(fetch.mock.calls[0].arguments[1].method, "DELETE")
    assert.equal(fetch.mock.calls[0].arguments[1].body, undefined)
    item.onError(new Error("Could not remove"))
    assert.deepEqual(errors, ["Could not remove"])
  } finally {
    fetch.mock.restore()
  }
})

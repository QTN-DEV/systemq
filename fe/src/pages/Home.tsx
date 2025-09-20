import type { ReactElement } from "react"

function Home(): ReactElement {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Home Page</h1>
      <p className="text-gray-600">Welcome to the home page!</p>
    </div>
  )
}

export default Home

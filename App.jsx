import Navbar from "./Component/navbar/navBar"
import SaveButton from "./Component/Button/saveButton"
import Footer from "./Component/footerFile/footerFile"



function App() {
  return (
    <>
      <Navbar />
      
      <div className="p-6 text-center mt-10 mb-20">
        <h1 className="text-3xl font-bold text-center">Welcome to the First Demat.</h1>
        <p className="text-center text-gray-500">Create your Demat Account Here</p>
        <SaveButton />
      </div>
      <Footer />
    </>
  )
}

export default App
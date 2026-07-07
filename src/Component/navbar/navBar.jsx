import LoginButton from "../Button/loginButton"
import HomeButton from "../Button/homeButton"
import SaveButton from "../Button/saveButton"
import Widget from "../Button/widget"
import App from "../Component/App.jsx"

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center bg-gray-800 text-white px-6 py-4">
      <div className="text-xl font-bold">Watch List</div>
      <ul className="flex gap-6">
        <li><SaveButton /></li>
        <li><HomeButton /></li>
        <li><Widget /></li>
        
      
      </ul>
      <LoginButton />
      
    </nav>
  )
}

export default Navbar
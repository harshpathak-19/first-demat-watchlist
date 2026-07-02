import SaveButton from "../Button/saveButton";

const FooterFile = () => {
    return (
      <footer className="fixed bottom-0 w-full bg-gray-800 text-white flex justify-between items-center px-6 py-4">
        <p>&copy; 2026 First Demat. All rights reserved.</p>
        <SaveButton />
      </footer>
    )
}

export default FooterFile
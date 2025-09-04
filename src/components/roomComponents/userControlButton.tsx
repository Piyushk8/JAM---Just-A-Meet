import { useDispatch } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { openUserControls } from "@/Redux/misc";
const UserControlButton = () => {
    const dispatch = useDispatch()
    const onClickHandler = ()=>{
      console.log("here")
        dispatch(openUserControls())
    }
  return (
    <button className="absolute z-30 top-5 right-5 rounded-full p-1" onClick={onClickHandler}>
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </button>
  );
};

export default UserControlButton;

import { useDispatch } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { openUserControls } from "@/Redux/misc";
import {motion} from "motion/react"

const UserControlButton = () => {
    const dispatch = useDispatch()
    const onClickHandler = ()=>{
        dispatch(openUserControls())
    }
  return (
    <motion.button whileHover={{scale:1.1}} className="rounded-full p-1" onClick={onClickHandler}>
      <Avatar className="h-10 w-10">
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </motion.button>
  );
};

export default UserControlButton;

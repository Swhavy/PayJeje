import { Linkedin, Twitter, Mail, Github } from "lucide-react";

const dev = {
  name: "Aaron Jack",
  role: "FullStack Developer",
  linkedin: "https://www.linkedin.com/in/aaron-jack/",
  twitter: "https://twitter.com/aaron-jack",
  skills: [
    "React",
    "JavaScript",
    "CSS",
    "Node.js",
    "Express",
    "MongoDB",
    "Python",
  ],
  Description:
    "Passionate about building user-friendly web applications and constantly learning new technologies.",
  email: "john.doe@example.com",
  twitter: "https://twitter.com/aaron-jack",
  github: "https://github.com/aaron-jack",
};

const DevCard = () => {
  return (
    <div className="dev-card bg-blue-accent/20 p-6  shadow-md text-white w-full h-screen">
      <div className="bg-blue-accent/80 rounded-lg h-full max-w-sm mx-auto relative border-[1px] border-blue-accent/80 shadow-md shadow-blue-accent">
        <div className="bg-gray-950 p-4 h-3/4 w-full rounded-b-lg mx-auto absolute bottom-0 flex flex-col">
          <div className="flex w-[7.15rem] h-[7.15rem] rounded-full animate-float  bg-blue-accent absolute -top-10 left-1/3 border-[1px] border-blue-accent/80 " />
          <img
            src="./devImage.jpg"
            alt={dev.name}
            className="flex w-28 h-28 left-1/3 object-cover rounded-full shadow-md shadow-blue-accent animate-float absolute -top-[2.38rem] border-[1px]"
          />
          <div className="flex flex-col items-center  mt-20">
            <h2 className="text-xl font-bold">{dev.name}</h2>
            <p className="text-blue-accent/80">{dev.role}</p>
            <p className="text-grey-300 text-center mt-2">{dev.Description}</p>
            <div className="flex flex-wrap justify-center mt-4">
              {dev.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-blue-accent/80 text-white text-sm font-medium px-2 py-1 rounded-full m-1"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="flex mt-4 space-x-4">
              <a
                href={dev.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-accent hover:text-blue-500 transition-colors duration-300"
              >
                <Linkedin />
              </a>
              <a
                href={dev.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-accent hover:text-blue-500 transition-colors duration-300"
              >
                <Twitter />
              </a>
              <a
                href={dev.email}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-accent hover:text-blue-500 transition-colors duration-300"
              >
                <Mail />
              </a>
              <a
                href={dev.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-accent hover:text-blue-500 transition-colors duration-300"
              >
                <Github />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevCard;

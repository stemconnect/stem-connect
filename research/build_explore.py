import json,sys
S=sys.argv[1]
onet=json.load(open(S+'/onet-raw.json')); meta=json.load(open(S+'/stories-raw.json'))
def edu(t):
    if 'graduate school' in t: return "Usually needs grad school (a master's degree or more)"
    if "four-year bachelor" in t: return "Usually needs a four-year college degree"
    if 'vocational' in t: return "Usually needs job training, a trade school or a two-year degree"
    return t
TASKS={
"19-1029.03":["Plan and run research on how genes work","Keep lab notebooks of methods and results","Present findings at conferences and in journals"],
"19-1023.00":["Count or estimate animal and plant populations","Study animals in the wild and how their environment affects them","Write reports and give talks to schools and the public"],
"19-1029.01":["Analyze large sets of genetic data","Build computer tools for biology research","Help researchers figure out how to solve a problem with computers"],
"29-1141.00":["Record patients' vital signs and medical information","Give medications and watch for side effects","Track and report changes in a patient's condition"],
"29-1071.00":["Examine patients","Read and interpret test results","Make diagnoses and treatment plans"],
"29-2042.00":["Give first aid and life support before patients reach a hospital","Decide how serious an injury is and what to do first","Comfort and reassure patients"],
"19-2031.00":["Analyze substances to find out what they're made of","Develop or improve products and formulas","Run quality control tests"],
"19-4031.00":["Run lab tests to help scientists","Set up experiments and analyses","Prepare chemical solutions"],
"17-2041.00":["Fix problems in chemical manufacturing","Write safety rules for people working near chemical reactions","Analyze data from processes and experiments"],
"19-2012.00":["Analyze data from experiments","Do complex calculations on computers","Write papers and present at conferences"],
"19-2011.00":["Study space with telescopes on the ground and in space","Analyze research data on computers","Work with other astronomers on research projects"],
"19-2032.00":["Research the structure of metals, plastics and ceramics","Test how strong materials are","Find ways to make new materials"],
"17-2141.00":["Read blueprints and technical drawings","Design and test mechanical products","Figure out why equipment failed"],
"17-2051.00":["Design roads, water systems and structures with design software","Inspect construction sites","Calculate loads and water flow"],
"17-2071.00":["Design electrical equipment and systems","Do detailed calculations for standards","Use computer design software"],
"17-2199.08":["Build, set up and test robots","Debug robot programs","Process and interpret sensor data"],
"17-3024.01":["Repair robots, sensors and motors","Troubleshoot robotic systems","Program robot controllers"],
"17-2199.05":["Design systems that automate tasks","Create design documents for parts","Test design solutions"],
"15-1252.00":["Figure out what users need","Fix bugs and improve software","Work with engineers to design systems"],
"15-1255.01":["Create missions, challenges and puzzles","Write storylines and characters","Balance and adjust gameplay"],
"15-1221.00":["Analyze problems and build hardware and software solutions","Find new ways to use computers","Design computers and the software that runs them"],
"15-1212.00":["Make plans to protect computer files","Set up encryption and firewalls","Run tests to check security"],
"15-1299.04":["Find weak spots using penetration tests","Write reports on what they found","Keep up with hacking trends"],
"15-1299.06":["Copy and preserve digital evidence","Investigate computer file systems","Write reports or testify in court"],
"15-2051.00":["Analyze large sets of data","Make charts that show the results","Test and improve prediction models"],
"15-2021.00":["Develop new math ideas","Publish and present research","Teach others math techniques"],
"15-2041.00":["Analyze data to find meaningful differences","Check that data methods are accurate","Report results with graphs and tables"],
"15-2011.00":["Estimate rates of accidents, illness and retirement","Calculate insurance prices","Design insurance and pension plans"],
"19-2041.00":["Collect and analyze soil, water and air data","Watch the effects of pollution and suggest fixes","Explain findings to the public"],
"17-2081.00":["Design systems that clean water, air or soil","Assess how projects affect the environment","Advise on cleaning up contaminated sites"],
"19-1031.03":["Lead field trips about nature","Give talks about park features","Care for park animals"],
"17-2011.00":["Design aircraft and spacecraft","Test models and prototypes","Diagnose performance problems"],
"17-3021.00":["Test aircraft systems in simulations","Set up and run test equipment","Collect and analyze test data"],
"19-2021.00":["Use computer models to forecast weather","Research weather and climate","Share forecasts and warnings with the public"],
"19-1042.00":["Study diseases and how to treat them","Analyze tissue and cell samples","Follow strict safety rules with toxic materials"],
"17-2031.00":["Design medical equipment and devices","Test medical equipment for safety","Research the engineering side of the human body with life scientists"],
}
SHORT={"19-1042.00":"Medical Scientists","19-2041.00":"Environmental Scientists","17-3021.00":"Aerospace Technicians","15-1221.00":"Computer Research Scientists"}
CAREERS={c:{"title":SHORT.get(c,onet[c]['title']),"url":onet[c]['url'],"edu":edu(onet[c]['edu']),"tasks":TASKS[c]} for c in TASKS}
STORY_BLURB={
"caffeine-brain-development-genes":"A teen dug into data from animal studies and found caffeine may turn down genes that matter for brain development.",
"regeneron-isef-2024-gene-editing-rice-climate-change":"An ISEF finalist showed CRISPR could change three genes that may keep rice from handling dry or salty soil.",
"giant-water-bugs-farm-insects-food":"Teens worked on new ways to farm giant water bugs, an insect many food cultures prize.",
"kid-teen-arthritis-cell-model":"A teen who has juvenile arthritis built a cell model to study the disease.",
"regeneron-isef-2024-smart-bandage-turmeric":"A teen made a turmeric bandage that turns red to show the pH of an infection.",
"baseball-pitcher-recovery-arm-health":"An ISEF finalist studied how pitchers rest between innings and how it affects arm health and pitch speed.",
"antiviral-drugs-corn-chemistry-isef":"A teen found a cheaper way to make drugs against deadly viruses and won the top award at ISEF 2025.",
"eco-friendly-sunscreen-bananas":"A teen is testing whether the natural sunscreen in bananas could protect skin without harming sea life.",
"regeneron-isef-2024-spinning-aerodynamics-vehicles-efficiency":"Teens found that roughing up the spinning cylinders some ships use as sails could boost fuel efficiency.",
"supermassive-black-holes-ancient-stars":"A teen's research suggests huge ancient stars may have collapsed into the black holes that built supermassive ones.",
"peroxide-fight-algal-blooms":"Inspired by the show Outer Banks, a teen engineer worked on cleaning up harmful algal blooms in a local waterway.",
"device-count-honeybees-varroa-mite-parasite":"Three teens built an infrared system that spots honeybees carrying mites, so beekeepers know when to treat a hive.",
"aerospike-rocket-nozzle-redesign":"Teens at ISEF 2026 tackled a problem that has held back super-efficient aerospike rocket engines.",
"soft-robots-comfort-rescue-isef":"ISEF teens built a hugging robot toy for anxious kids and a snake-like robot for rescues.",
"mobile-artificial-coral-reef":"Two teens designed and built self-navigating underwater 'houseboats' for young coral.",
"teen-created-software-ids-skin-conditions-risky-drivers-and-translate-asl":"At ISEF 2023, teens showed programs that spot skin conditions, warn about risky driving and translate sign language.",
"regeneron-isef-2024-ukraine-battle-simulator-ground-attacks":"Volodymyr Borysenko built software at ISEF 2024 to help Ukraine defend against ground attacks.",
"ai-agent-shield-prompt-injection-attack":"A teen wrote software to protect AI agents that handle private data from sneaky 'prompt injection' attacks.",
"app-guards-against-bad-ai-agents-bots":"An ISEF finalist made an app that helps stop chatbots from developing dangerous personalities.",
"ai-generated-text-style-isef":"A teen's software compares two texts to check whether they share a writer's style, to help spot AI-written work.",
"teen-designed-tech-could-expand-access-for-people-with-disabilities":"Inventors at ISEF 2022 built tech that translates sign language and helps blind people get around.",
"2026-regeneron-isef-winners-origami":"Origami research won the top prize at the 2026 Regeneron ISEF.",
"2024-regeneron-isef-winners-bioelectronics-genetics-math":"The top 2024 ISEF awards went to projects in bioelectronics, genetics and math.",
"arctic-current-bowhead-whales":"A teen found bowhead whale migrations may be responding to a changing Arctic current.",
"magnets-gravity-plants-in-space":"ISEF teens used magnets to guide plants that grow without steady gravity, like on a space station.",
}
STORIES={s:{"title":meta[s]['title'],"url":"https://www.snexplores.org/article/"+s,"date":meta[s]['date'],"blurb":b} for s,b in STORY_BLURB.items()}
F=lambda intro,subs,careers,stories:{"intro":intro,"subs":[{"name":a,"blurb":b,"topic":c} for a,b,c in subs],"careers":careers,"stories":stories}
FIELDS={
"bio":F("How living things work, from single cells to whole forests.",[("Genetics","How traits pass down and how genes work","genetics"),("Ecology","How living things affect each other and where they live","ecosystems"),("Zoology","Animal behavior, bodies and evolution","animals"),("Botany","Plants and how they grow","plants"),("Microbiology","Bacteria, viruses and other tiny life","microbes"),("Neuroscience","The brain and nervous system","brain")],["19-1029.03","19-1023.00","19-1029.01"],["caffeine-brain-development-genes","regeneron-isef-2024-gene-editing-rice-climate-change","giant-water-bugs-farm-insects-food"]),
"med":F("Keeping people healthy and figuring out what makes them sick.",[("Patient care","Nursing, physician assistants, EMTs and doctors","health-medicine"),("Medical research","Finding out what causes disease and testing treatments","health-medicine"),("Mental health","How the mind works and how to help people feel better","psychology"),("Sports medicine","Injuries, recovery and physical therapy",None),("Public health","Keeping whole communities healthy",None)],["29-1141.00","29-1071.00","29-2042.00"],["kid-teen-arthritis-cell-model","regeneron-isef-2024-smart-bandage-turmeric","baseball-pitcher-recovery-arm-health"]),
"chem":F("What stuff is made of and how it changes.",[("Organic chemistry","Carbon-based molecules like medicines and plastics","chemistry"),("Biochemistry","The chemistry inside living things","chemistry"),("Materials chemistry","Designing new materials","materials-science"),("Environmental chemistry","Pollution, water and air quality","environment"),("Analytical chemistry","Figuring out exactly what's in a sample","chemistry")],["19-2031.00","19-4031.00","17-2041.00"],["antiviral-drugs-corn-chemistry-isef","eco-friendly-sunscreen-bananas"]),
"phys":F("The rules behind motion, energy, light and matter.",[("Mechanics","Forces and motion","physics"),("Electricity and magnetism","Circuits, magnets and light","physics"),("Quantum physics","How the tiniest particles behave","physics"),("Astrophysics","Physics of stars, galaxies and black holes","space"),("Condensed matter","Why solids and liquids act the way they do","materials-science")],["19-2012.00","19-2011.00","19-2032.00"],["regeneron-isef-2024-spinning-aerodynamics-vehicles-efficiency","supermassive-black-holes-ancient-stars"]),
"eng":F("Designing and building things that solve real problems.",[("Mechanical","Machines and moving parts","tech"),("Civil","Bridges, roads and water systems",None),("Electrical","Circuits, power and electronics","tech"),("Biomedical","Medical equipment and devices","health-medicine"),("Environmental","Systems for clean water, air and soil","environment"),("Aerospace","Aircraft and spacecraft","space")],["17-2141.00","17-2051.00","17-2071.00"],["peroxide-fight-algal-blooms","device-count-honeybees-varroa-mite-parasite","aerospike-rocket-nozzle-redesign"]),
"robo":F("Machines that sense, decide and move on their own.",[("Mechanical design","Building the robot's body and moving parts","tech"),("Electronics and sensors","Wiring, motors and how robots sense the world","tech"),("Programming and control","Code that tells a robot what to do","computing"),("Robot AI","Robots that learn and make decisions","artificial-intelligence"),("Drones","Flying robots",None)],["17-2199.08","17-3024.01","17-2199.05"],["soft-robots-comfort-rescue-isef","mobile-artificial-coral-reef"]),
"cs":F("Writing code to build apps, games, tools and websites.",[("Software development","Building programs people use","computing"),("Web and app design","Websites and phone apps","computing"),("Game design","Making video games","computing"),("Algorithms","Finding the fastest, smartest way to solve a problem","math"),("Data","Using code to work with big sets of information","computing")],["15-1252.00","15-1255.01","15-1221.00"],["teen-created-software-ids-skin-conditions-risky-drivers-and-translate-asl","regeneron-isef-2024-ukraine-battle-simulator-ground-attacks"]),
"cyber":F("Protecting computers, networks and people's data from attackers.",[("Network security","Keeping networks safe from intruders","computing"),("Ethical hacking","Breaking in, with permission, to find weak spots","computing"),("Digital forensics","Finding evidence on computers and phones",None),("Cryptography","The math of secret codes","math"),("Privacy","Laws and choices about personal data","science-society")],["15-1212.00","15-1299.04","15-1299.06"],["ai-agent-shield-prompt-injection-attack","app-guards-against-bad-ai-agents-bots"]),
"ai":F("Teaching computers to learn from data and make decisions.",[("Machine learning","Programs that get better from examples","artificial-intelligence"),("Language AI","Chatbots and programs that work with text","artificial-intelligence"),("Computer vision","Programs that understand images and video","artificial-intelligence"),("Robot AI","AI that controls machines in the real world","tech"),("AI ethics","Making AI fair, safe and honest","science-society")],["15-2051.00","15-1221.00","17-2199.08"],["ai-generated-text-style-isef","teen-designed-tech-could-expand-access-for-people-with-disabilities"]),
"math":F("Patterns, logic and proof, plus the math behind data and money.",[("Pure math","Proofs, patterns and number puzzles","math"),("Statistics","Data, chance and what numbers really mean","math"),("Applied math","Using math models to solve real problems","math"),("Actuarial science","Measuring risk for insurance and money",None),("Cryptography","Number theory behind secret codes","math")],["15-2021.00","15-2041.00","15-2011.00"],["2026-regeneron-isef-winners-origami","2024-regeneron-isef-winners-bioelectronics-genetics-math"]),
"env":F("How the planet works and how to protect it.",[("Climate science","How and why the climate is changing","climate"),("Conservation","Protecting habitats and wildlife","ecosystems"),("Oceans","Marine life and the sea","oceans"),("Earth science","Rocks, water and landforms","earth"),("Sustainable farming","Growing food without wrecking the land","agriculture")],["19-2041.00","17-2081.00","19-1031.03"],["arctic-current-bowhead-whales","peroxide-fight-algal-blooms","mobile-artificial-coral-reef"]),
"space":F("Rockets, planets, stars and the people who study them.",[("Astronomy","Stars, galaxies and the universe","space"),("Planetary science","Planets, moons and asteroids","planets"),("Aerospace engineering","Designing rockets and spacecraft","tech"),("Space biology","How living things handle space","life"),("Earth from space","Satellites that watch weather and climate","climate")],["17-2011.00","19-2011.00","17-3021.00"],["magnets-gravity-plants-in-space","aerospike-rocket-nozzle-redesign","supermassive-black-holes-ancient-stars"]),
}
CROSS=[
(["bio","cs"],"Bioinformatics","Use code to make sense of DNA and other biology data.","19-1029.01"),
(["bio","med"],"Medical research","Study diseases and test new treatments.","19-1042.00"),
(["med","eng"],"Biomedical engineering","Design medical equipment and devices.","17-2031.00"),
(["chem","eng"],"Chemical engineering","Take chemistry from the lab to safe manufacturing.","17-2041.00"),
(["chem","phys"],"Materials science","Find out how materials behave and invent new ones.","19-2032.00"),
(["env","eng"],"Environmental engineering","Design systems that clean water, air and soil.","17-2081.00"),
(["bio","env"],"Wildlife biology","Study animals in the wild and how their habitat affects them.","19-1023.00"),
(["robo","ai"],"Robotics + AI","Build robots that use sensor data to decide what to do.","17-2199.08"),
(["robo","eng"],"Mechatronics","Mix mechanical, electrical and computer engineering to automate tasks.","17-2199.05"),
(["cs","math","ai"],"Data science","Use code and statistics to find patterns in data.","15-2051.00"),
(["cs","cyber"],"Ethical hacking","Break into systems, with permission, to find weak spots.","15-1299.04"),
(["ai","cyber"],"AI security","Keep computer systems, including AI, safe from attacks.","15-1212.00"),
(["phys","space"],"Astrophysics","Use physics to study stars, galaxies and black holes.","19-2011.00"),
(["env","space"],"Weather and climate science","Use data and models to forecast weather and study climate.","19-2021.00"),
(["space","eng"],"Aerospace engineering","Design and test aircraft and spacecraft.","17-2011.00"),
]
out={"SOURCES":{"careers":{"name":"O*NET OnLine (U.S. Department of Labor)","url":"https://www.onetonline.org/"},"stories":{"name":"Science News Explores","url":"https://www.snexplores.org/"},"topic":"https://www.snexplores.org/topic/"},
 "FIELDS":FIELDS,"CROSSOVERS":[{"fields":a,"name":b,"blurb":c,"career":d} for a,b,c,d in CROSS],"CAREERS":CAREERS,"STORIES":STORIES}
for k,v in FIELDS.items():
    for c in v['careers']: assert c in CAREERS,c
    for s in v['stories']: assert s in STORIES,s
for c in out['CROSSOVERS']: assert c['career'] in CAREERS
json.dump(out,open('explore.json','w'),ensure_ascii=False,separators=(',',':'))
print('ok',len(CAREERS),len(STORIES))

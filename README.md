# teams-scaling-agent-based-model

## INSTALLING (local)
* Download Netlogo 6.3.0 (https://ccl.northwestern.edu/netlogo/download.shtml)
* Open the project file in Netlogo

  

## WHAT IS IT?

This model of scaling product development teams illustrates the behaviour of how adding new team members into a startup environment (which usually starts with one team) negatively impacts the output created by the whole product development department.
Product development teams are usually cross-functional teams of individuals from different areas (product manager, UX, developers etc.) that work in an agile environment. 

The exact rules are defined based on my empirical experience working in various companies of different sizes and incorporate 2 well-knonw theoretical concepts:

-  Classification of a group's life cycle - proposed by psychologist Bruce Tuckman in 1965
- The law of diminishing marginal productivity/returns -  first conceptualized by David Ricardo in his book "On the Principles of Political Economy and Taxation," published in 1817



## HOW IT WORKS

The seniority slider enables us to set the % of senior vs junior team members. This allows for experimenting with finding the right balance between output and cost and it can also help companies find the right strategy (e.g. some startups start with hiring only juniors while expecting the same level of output as by hiring seniors).

On setup, 1 team is created with 5 members. They have just started to work together, so they are in the forming stage, which is color-coded in the patch color around the team. The number 5 team members were chosen arbitrarily as a minimum where a team is able to build software together given its cross-functional nature.

The team grows by randomly adding new team member(s) to the existing teams, on every tick. A tick represents a time unit, which in this model is 1 month.

Once the size of one of the teams turns 10, even though the overall productivity still grows by adding a new team member, the marginal output is very small and the overall output starts decreasing soon after. Due to this, we split the team into 2 equal teams of 5 members.

The agents are assembled into individual teams (agentsets), and each team has a different color of agents.

To visually indicate the performance of the team, we are using an adapted version of the Tuckman's classification of the team life cycle (forming-storming-norming-performing), and for our modelling purposes, we are using the following criteria:

- time of the team together without interruption and interruption causing a penalty for the teams that were interrupted,
- individual output based on seniority,
- the number of team members in the team,
- adjusted by using exponential decay to account for the  Law of diminishing marginal productivity. Based on some experimentation with different values, the value of decay used will be 6%.

A total-output-team score computed based on the criteria above is translated into the color of the patches as follows: 

- forming: light grey
- storming: light yellow 
- norming: light orange
- performing: light purple



## HOW TO USE IT

Click the SETUP button to start with a single team. Click GO to add team members. 1 tick represents 1 month.

### Parameters

- senioritySlider - represents the % of seniors vs. juniors based on the strategy of the company (setting a certain % represents the % of seniors from the new joiners)
- turtleGrowthSlider - represents the absolute number of agents (new joiners) that will be added over 1 year (12 months)

### Plots
-  perceived output vs. real output

### Other outputs
- number of teams
- ticks (months)
- number of agents (members of product development)



## THINGS TO NOTICE

- the perceived output is what most leaders in organizations naively think when adding new team members.
- the real output incorporating how adding new team members disturbs the existing teams and applying the rule of diminishing marginal productivity represents a simplified version of the reality.
- having only senior team members logically creates much more output, which is how most of startup companies start.
- high growth means that the teams will be very far from their potential and will only truly start growing after multiple years of working together. Try this by setting turtleGrowthSlider = 20. In this case, the teams will be unfunctional with very low output for 3 years and will start picking up in productivity after that.
- one team without new team members can be surprisingly effective in a very short time. Of course, there is a limit to their max output. Try this with turtleGrowthSlider = 0.
- see how randomly the real output behaves with a low number of ticks. This is because of the low number of teams, where it makes a huge difference to which team the new joiners are added.



## THINGS TO TRY

- set the turtleGrowthSlider = 20 and see how long the teams will be unfunctional
- set the turtleGrowthSlide = 0 and see how quickly the teams will become productive. Also, see the limit in their output.
- play around with the different % of senior agents and notice how the output changes.



## EXTENDING THE MODEL

There is a potential to further grow this model to account for various other factors that can influence the team performance:

- adjust the growth rate of the company for every year -> currently we assume , there is a constant yearly growth as per the turtleGrowthSlider.
- considering further collaboration based on previous links between individuals. 
- fluctuation rate that can be influenced by
	- company culture,
	- growth possibilities (e.g. for seniors the growth opportunities are often limited and mentoring juniors can be one of the motivations to stay and grow).
- considering different timeframes for transitioning between the performance stages based on Tuckman's definition.
	- currently, we consider transitioning from one stage to another after 4 ticks (4 months), however, this can vary greatly based on the investments of the company into levelling up the teams. Also transitioning from storming to norming and later performing can take much more time, and is also dependent on previous links between the team members (as already mentioned above) and complementary skills.
- accounting for the last stage defined by Tuckman  = adjourning in the form of shuffling around teams in certain periods, which can greatly improve the motivation of team members for which after the performance stage, the output might start declining as the individuals lack growth opportunities.
- the concept of accumulating tech debt due to the inexperience of junior team members if the proportion of juniors vs seniors is not well balanced.
- incorporating the growth of team members from juniors to seniors -> the potential model does not account for this fact properly, only rudimentarily in allowing juniors to organically achieve the max output points.

## NETLOGO FEATURES

- working with individual agents and grouping them into agentsets 
- grouping the agentsets together visually on the interface and coloring the patches based on the output of the agentset
- the final output depending on the activity of agentset and individual agents as well as their inactivity with the help of a counter logic
- the logic of adding a selected total number of agents over a defined period randomly


## RELATED MODELS

Team Assembly - a model of collaboration networks illustrates how the behavior of individuals in assembling small teams for short-term projects can give rise to a variety of large-scale network structures over time 

## CREDITS AND REFERENCES

If you mention this model or the NetLogo software in a publication, we ask that you include the citations below.

For the model itself:
Lechner K., 2023. NetLogo Product Team Scaling model. 

Please cite the NetLogo software as:

Wilensky, U. (1999). NetLogo. http://ccl.northwestern.edu/netlogo/. Center for Connected Learning and Computer-Based Modeling, Northwestern University, Evanston, IL.
